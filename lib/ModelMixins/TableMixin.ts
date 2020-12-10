import { action, computed, observable, runInAction } from "mobx";
import { createTransformer } from "mobx-utils";
import DeveloperError from "terriajs-cesium/Source/Core/DeveloperError";
import JulianDate from "terriajs-cesium/Source/Core/JulianDate";
import Rectangle from "terriajs-cesium/Source/Core/Rectangle";
import TimeInterval from "terriajs-cesium/Source/Core/TimeInterval";
import CustomDataSource from "terriajs-cesium/Source/DataSources/CustomDataSource";
import DataSource from "terriajs-cesium/Source/DataSources/DataSource";
import Entity from "terriajs-cesium/Source/DataSources/Entity";
import ImageryLayerFeatureInfo from "terriajs-cesium/Source/Scene/ImageryLayerFeatureInfo";
import { ChartPoint } from "../Charts/ChartData";
import getChartColorForId from "../Charts/getChartColorForId";
import AsyncLoader from "../Core/AsyncLoader";
import Constructor from "../Core/Constructor";
import filterOutUndefined from "../Core/filterOutUndefined";
import isDefined from "../Core/isDefined";
import { JsonObject } from "../Core/Json";
import { isLatLonHeight } from "../Core/LatLonHeight";
import makeRealPromise from "../Core/makeRealPromise";
import TerriaError from "../Core/TerriaError";
import MapboxVectorTileImageryProvider from "../Map/MapboxVectorTileImageryProvider";
import RegionProvider from "../Map/RegionProvider";
import JSRegionProviderList from "../Map/RegionProviderList";
import { calculateDomain, ChartAxis, ChartItem } from "../Models/Chartable";
import CommonStrata from "../Models/CommonStrata";
import { ImageryParts } from "../Models/Mappable";
import Model from "../Models/Model";
import ModelPropertiesFromTraits from "../Models/ModelPropertiesFromTraits";
import SelectableDimensions, {
  SelectableDimension
} from "../Models/SelectableDimensions";
import createLongitudeLatitudeFeaturePerId from "../Table/createLongitudeLatitudeFeaturePerId";
import createLongitudeLatitudeFeaturePerRow from "../Table/createLongitudeLatitudeFeaturePerRow";
import TableColumn from "../Table/TableColumn";
import TableColumnType from "../Table/TableColumnType";
import TableStyle from "../Table/TableStyle";
import LegendTraits from "../Traits/LegendTraits";
import TableTraits from "../Traits/TableTraits";
import AsyncMappableMixin from "./AsyncMappableMixin";
import DiscretelyTimeVaryingMixin, {
  DiscreteTimeAsJS
} from "./DiscretelyTimeVaryingMixin";
import ExportableMixin, { ExportData } from "./ExportableMixin";
import TimeVarying from "./TimeVarying";

// TypeScript 3.6.3 can't tell JSRegionProviderList is a class and reports
//   Cannot use namespace 'JSRegionProviderList' as a type.ts(2709)
// This is a dodgy workaround.
class RegionProviderList extends JSRegionProviderList {}
function TableMixin<T extends Constructor<Model<TableTraits>>>(Base: T) {
  abstract class TableMixin
    extends ExportableMixin(
      AsyncMappableMixin(DiscretelyTimeVaryingMixin(Base))
    )
    implements SelectableDimensions, TimeVarying {
    get hasTableMixin() {
      return true;
    }
    /**
     * The raw data table in column-major format, i.e. the outer array is an
     * array of columns.
     */
    @observable
    dataColumnMajor: string[][] | undefined;

    /**
     * The list of region providers to be used with this table.
     */
    @observable
    regionProviderList: RegionProviderList | undefined;

    private _dataLoader = new AsyncLoader(this.forceLoadTableMixin.bind(this));

    /**
     * Gets a {@link TableColumn} for each of the columns in the raw data.
     */
    @computed
    get tableColumns(): readonly TableColumn[] {
      if (this.dataColumnMajor === undefined) {
        return [];
      }
      return this.dataColumnMajor.map((_, i) => this.getTableColumn(i));
    }

    /**
     * Gets a {@link TableStyle} for each of the {@link styles}. If there
     * are no styles, returns an empty array.
     */
    @computed
    get tableStyles(): TableStyle[] {
      if (this.styles === undefined) {
        return [];
      }
      return this.styles.map((_, i) => this.getTableStyle(i));
    }

    /**
     * Gets the default {@link TableStyle}, which is used for styling
     * only when there are no styles defined.
     */
    @computed
    get defaultTableStyle(): TableStyle {
      return new TableStyle(this, -1);
    }

    /**
     * Gets the {@link TableStyleTraits#id} of the currently-active style.
     * Note that this is a trait so there is no guarantee that a style
     * with this ID actually exists. If no active style is explicitly
     * specified, the ID of the first style with a scalar color column is used.
     * If there is no such style the id of the first style of the {@link #styles}
     * is used.
     */
    @computed
    get activeStyle(): string | undefined {
      const value = super.activeStyle;
      if (value !== undefined) {
        return value;
      } else if (this.styles && this.styles.length > 0) {
        // Find and return a style with scalar color column if it exists,
        // otherwise just return the first available style id.
        const styleWithScalarColorColumn = this.styles.find(s => {
          const colName = s.color.colorColumn;
          return (
            colName &&
            this.findColumnByName(colName)?.type === TableColumnType.scalar
          );
        });
        return styleWithScalarColorColumn?.id || this.styles[0].id;
      }
      return undefined;
    }

    /**
     * Gets the active {@link TableStyle}, which is the item from {@link #tableStyles}
     * with an ID that matches {@link #activeStyle}, if any.
     */
    @computed
    get activeTableStyle(): TableStyle {
      const activeStyle = this.activeStyle;
      if (activeStyle === undefined) {
        return this.defaultTableStyle;
      }
      let ret = this.tableStyles.find(style => style.id === this.activeStyle);
      if (ret === undefined) {
        return this.defaultTableStyle;
      }

      return ret;
    }

    @computed
    get xColumn(): TableColumn | undefined {
      return this.activeTableStyle.xAxisColumn;
    }

    @computed
    get yColumns(): TableColumn[] {
      const lines = this.activeTableStyle.chartTraits.lines;
      return filterOutUndefined(
        lines.map(line =>
          line.yAxisColumn === undefined
            ? undefined
            : this.findColumnByName(line.yAxisColumn)
        )
      );
    }

    @computed
    get disableOpacityControl() {
      // disable opacity control for point tables
      return this.activeTableStyle.isPoints();
    }

    @computed
    get _canExportData() {
      return isDefined(this.dataColumnMajor);
    }

    protected async _exportData(): Promise<ExportData | undefined> {
      if (isDefined(this.dataColumnMajor)) {
        // I am assuming all columns have the same length -> so use first column
        let csvString = this.dataColumnMajor[0]
          .map((row, rowIndex) =>
            this.dataColumnMajor!.map(col => col[rowIndex]).join(",")
          )
          .join("\n");

        return {
          name: (this.name || this.uniqueId)!,
          file: new Blob([csvString])
        };
      }

      throw new TerriaError({
        sender: this,
        message: "No data available to download."
      });
    }

    get supportsSplitting() {
      return isDefined(this.activeTableStyle.regionColumn);
    }

    /**
     * Gets the items to show on the map.
     */
    @computed
    get mapItems(): (DataSource | ImageryParts)[] {
      return filterOutUndefined([
        this.createLongitudeLatitudeDataSource(this.activeTableStyle),
        this.createRegionMappedImageryLayer({
          style: this.activeTableStyle,
          currentTime: this.currentDiscreteJulianDate
        })
      ]);
    }

    /**
     * Gets the items to show on a chart.
     *
     */
    @computed
    get chartItems(): ChartItem[] {
      const style = this.activeTableStyle;
      if (style === undefined || !style.isChart()) {
        return [];
      }

      const xColumn = style.xAxisColumn;
      const lines = style.chartTraits.lines;
      if (xColumn === undefined || lines.length === 0) {
        return [];
      }

      const xValues: readonly (Date | number | null)[] =
        xColumn.type === TableColumnType.time
          ? xColumn.valuesAsDates.values
          : xColumn.valuesAsNumbers.values;

      const xAxis: ChartAxis = {
        scale: xColumn.type === TableColumnType.time ? "time" : "linear",
        units: xColumn.units
      };

      return filterOutUndefined(
        lines.map(line => {
          const yColumn = line.yAxisColumn
            ? this.findColumnByName(line.yAxisColumn)
            : undefined;
          if (yColumn === undefined) {
            return undefined;
          }
          const yValues = yColumn.valuesAsNumbers.values;

          const points: ChartPoint[] = [];
          for (let i = 0; i < xValues.length; ++i) {
            const x = xValues[i];
            const y = yValues[i];
            if (x === null || y === null) {
              continue;
            }
            points.push({ x, y });
          }

          const colorId = `color-${this.uniqueId}-${this.name}-${yColumn.name}`;

          return {
            item: this,
            name: yColumn.title,
            categoryName: this.name,
            key: `key${this.uniqueId}-${this.name}-${yColumn.name}`,
            type: "line",
            xAxis,
            points,
            domain: calculateDomain(points),
            units: yColumn.units,
            isSelectedInWorkbench: line.isSelectedInWorkbench,
            showInChartPanel: this.show && line.isSelectedInWorkbench,
            updateIsSelectedInWorkbench: (isSelected: boolean) => {
              runInAction(() => {
                line.setTrait(
                  CommonStrata.user,
                  "isSelectedInWorkbench",
                  isSelected
                );
              });
            },
            getColor: () => {
              return line.color || getChartColorForId(colorId);
            },
            pointOnMap: isLatLonHeight(this.chartPointOnMap)
              ? this.chartPointOnMap
              : undefined
          };
        })
      );
    }

    @computed
    get selectableDimensions(): SelectableDimension[] {
      return filterOutUndefined([
        this.regionColumnDimensions,
        this.regionProviderDimensions,
        this.styleDimensions
      ]);
    }

    /**
     * Takes {@link TableStyle}s and returns a SelectableDimension which can be rendered in a Select dropdown
     */
    @computed
    get styleDimensions(): SelectableDimension | undefined {
      if (this.mapItems.length === 0 && !this.enableManualRegionMapping) {
        return;
      }

      return {
        id: "activeStyle",
        name: "Display Variable",
        options: this.tableStyles.map(style => {
          return {
            id: style.id,
            name: style.styleTraits.title || style.id
          };
        }),
        selectedId: this.activeStyle,
        setDimensionValue: (stratumId: string, styleId: string) => {
          this.setTrait(stratumId, "activeStyle", styleId);
        }
      };
    }

    /**
     * Creates SelectableDimension for regionProviderList - the list of all available region providers.
     * {@link TableTraits#enableManualRegionMapping} must be enabled.
     */
    @computed
    get regionProviderDimensions(): SelectableDimension | undefined {
      if (
        !this.enableManualRegionMapping ||
        !Array.isArray(this.regionProviderList?.regionProviders) ||
        !isDefined(this.activeTableStyle.regionColumn)
      ) {
        return;
      }

      return {
        id: "regionMapping",
        name: "Region Mapping",
        options: this.regionProviderList!.regionProviders.map(
          regionProvider => {
            return {
              name: regionProvider.regionType,
              id: regionProvider.regionType
            };
          }
        ),
        allowUndefined: true,
        selectedId: this.activeTableStyle.regionColumn?.regionType?.regionType,
        setDimensionValue: (stratumId: string, regionType: string) => {
          let columnTraits = this.columns?.find(
            column => column.name === this.activeTableStyle.regionColumn?.name
          );
          if (!isDefined(columnTraits)) {
            columnTraits = this.addObject(
              stratumId,
              "columns",
              this.activeTableStyle.regionColumn!.name
            )!;
            columnTraits.setTrait(
              stratumId,
              "name",
              this.activeTableStyle.regionColumn!.name
            );
          }

          columnTraits.setTrait(stratumId, "regionType", regionType);
        }
      };
    }

    /**
     * Creates SelectableDimension for region column - the options contains a list of all columns.
     * {@link TableTraits#enableManualRegionMapping} must be enabled.
     */
    @computed
    get regionColumnDimensions(): SelectableDimension | undefined {
      if (
        !this.enableManualRegionMapping ||
        !Array.isArray(this.regionProviderList?.regionProviders)
      ) {
        return;
      }

      return {
        id: "regionColumn",
        name: "Region Column",
        options: this.tableColumns.map(col => {
          return {
            name: col.name,
            id: col.name
          };
        }),
        selectedId: this.activeTableStyle.regionColumn?.name,
        setDimensionValue: (stratumId: string, regionCol: string) => {
          this.defaultStyle.setTrait(stratumId, "regionColumn", regionCol);
        }
      };
    }

    @computed
    get rowIds(): number[] {
      const nRows = (this.dataColumnMajor?.[0]?.length || 1) - 1;
      const ids = [...new Array(nRows).keys()];
      return ids;
    }

    @computed
    get isSampled(): boolean {
      return this.activeTableStyle.timeTraits.isSampled;
    }

    @computed
    get discreteTimes():
      | { time: string; tag: string | undefined }[]
      | undefined {
      const dates = this.activeTableStyle.timeColumn?.valuesAsDates.values;
      if (dates === undefined) {
        return;
      }
      const times = filterOutUndefined(
        dates.map(d =>
          d ? { time: d.toISOString(), tag: undefined } : undefined
        )
      ).reduce(
        // is it correct for discrete times to remove duplicates?
        // see discussion on https://github.com/TerriaJS/terriajs/pull/4577
        // duplicates will mess up the indexing problem as our `<DateTimePicker />`
        // will eliminate duplicates on the UI front, so given the datepicker
        // expects uniques, return uniques here
        (acc: DiscreteTimeAsJS[], time) =>
          !acc.some(
            accTime => accTime.time === time.time && accTime.tag === time.tag
          )
            ? [...acc, time]
            : acc,
        []
      );
      return times;
    }

    @computed
    get legends() {
      if (this.mapItems.length > 0) {
        const colorLegend = this.activeTableStyle.colorTraits.legend;
        return filterOutUndefined([colorLegend]);
      } else {
        return [];
      }
    }

    findFirstColumnByType(type: TableColumnType): TableColumn | undefined {
      return this.tableColumns.find(column => column.type === type);
    }

    findColumnByName(name: string): TableColumn | undefined {
      return this.tableColumns.find(column => column.name === name);
    }

    protected abstract forceLoadTableData(): Promise<string[][]>;

    protected async loadRegionProviderList() {
      if (isDefined(this.regionProviderList)) return;

      const regionProvidersPromise:
        | RegionProviderList
        | undefined = await makeRealPromise(
        RegionProviderList.fromUrl(
          this.terria.configParameters.regionMappingDefinitionsUrl,
          this.terria.corsProxy
        )
      );
      runInAction(() => (this.regionProviderList = regionProvidersPromise));
    }

    private async forceLoadTableMixin(): Promise<void> {
      await this.loadRegionProviderList();

      const dataColumnMajor = await this.forceLoadTableData();
      runInAction(() => {
        this.dataColumnMajor = dataColumnMajor;
      });
    }

    protected forceLoadChartItems(force?: boolean) {
      return this._dataLoader.load(force);
    }

    protected forceLoadMapItems(force?: boolean) {
      return this._dataLoader.load(force);
    }

    dispose() {
      super.dispose();
      this._dataLoader.dispose();
    }

    /*
     * Appends new table data in column major format to this table.
     * It is assumed that thhe column order is the same for both the tables.
     */
    @action
    append(dataColumnMajor2: string[][]) {
      if (
        this.dataColumnMajor !== undefined &&
        this.dataColumnMajor.length !== dataColumnMajor2.length
      ) {
        throw new DeveloperError(
          "Cannot add tables with different numbers of columns."
        );
      }

      const appended = this.dataColumnMajor || [];
      dataColumnMajor2.forEach((newRows, col) => {
        if (appended[col] === undefined) {
          appended[col] = [];
        }
        appended[col].push(...newRows);
      });
      this.dataColumnMajor = appended;
    }

    private readonly createLongitudeLatitudeDataSource = createTransformer(
      (style: TableStyle): DataSource | undefined => {
        if (!style.isPoints()) {
          return undefined;
        }

        const dataSource = new CustomDataSource(this.name || "Table");
        dataSource.entities.suspendEvents();

        let features: Entity[];
        if (style.isTimeVaryingPointsWithId()) {
          features = createLongitudeLatitudeFeaturePerId(style);
        } else {
          features = createLongitudeLatitudeFeaturePerRow(style);
        }

        features.forEach(f => dataSource.entities.add(f));
        dataSource.show = this.show;
        dataSource.entities.resumeEvents();
        return dataSource;
      }
    );

    private readonly createRegionMappedImageryLayer = createTransformer(
      (input: {
        style: TableStyle;
        currentTime: JulianDate | undefined;
      }): ImageryParts | undefined => {
        if (!input.style.isRegions()) {
          return undefined;
        }

        const regionColumn = input.style.regionColumn;
        const regionType = regionColumn.regionType;
        if (regionType === undefined) {
          return undefined;
        }

        const baseMapContrastColor = "white"; //this.terria.baseMapContrastColor;

        const colorColumn = input.style.colorColumn;
        const valueFunction =
          colorColumn !== undefined
            ? colorColumn.valueFunctionForType
            : () => null;
        const colorMap = (this.activeTableStyle || this.defaultTableStyle)
          .colorMap;
        const valuesAsRegions = regionColumn.valuesAsRegions;

        let currentTimeRows: number[];

        // TODO: this is already implemented in RegionProvider.prototype.mapRegionsToIndicesInto, but regionTypes require "loading" for this to work. I think the whole RegionProvider thing needs to be re-done in TypeScript at some point and then we can move stuff into that.
        // If time varying, get row indices which match
        if (input.currentTime && input.style.timeIntervals) {
          currentTimeRows = input.style.timeIntervals.reduce<number[]>(
            (rows, timeInterval, index) => {
              if (
                timeInterval &&
                TimeInterval.contains(timeInterval, input.currentTime!)
              ) {
                rows.push(index);
              }
              return rows;
            },
            []
          );
        }

        /**
         * Filters row numbers by time (if applicable)
         */
        function filterRows(
          rowNumbers: number | readonly number[] | undefined
        ): number | undefined {
          if (!isDefined(rowNumbers)) return;

          if (!isDefined(currentTimeRows)) {
            return Array.isArray(rowNumbers) ? rowNumbers[0] : rowNumbers;
          }

          if (
            typeof rowNumbers === "number" &&
            currentTimeRows.includes(rowNumbers)
          ) {
            return rowNumbers;
          } else if (Array.isArray(rowNumbers)) {
            const matchingTimeRows: number[] = rowNumbers.filter(row =>
              currentTimeRows.includes(row)
            );
            if (matchingTimeRows.length <= 1) {
              return matchingTimeRows[0];
            }
            //In a time-varying dataset, intervals may
            // overlap at their endpoints (i.e. the end of one interval is the start of the next).
            // In that case, we want the later interval to apply.
            return matchingTimeRows.reduce((latestRow, currentRow) => {
              const currentInterval =
                input.style.timeIntervals?.[currentRow]?.stop;
              const latestInterval =
                input.style.timeIntervals?.[latestRow]?.stop;
              if (
                currentInterval &&
                latestInterval &&
                JulianDate.lessThan(latestInterval, currentInterval)
              ) {
                return currentRow;
              }
              return latestRow;
            }, matchingTimeRows[0]);
          }
        }

        return {
          alpha: this.opacity,
          imageryProvider: new MapboxVectorTileImageryProvider({
            url: regionType.server,
            layerName: regionType.layerName,
            styleFunc: function(feature: any) {
              const featureRegion = feature.properties[regionType.regionProp];
              const regionIdString =
                featureRegion !== undefined && featureRegion !== null
                  ? featureRegion.toString()
                  : "";
              let rowNumber = filterRows(
                valuesAsRegions.regionIdToRowNumbersMap.get(
                  regionIdString.toLowerCase()
                )
              );
              let value: string | number | null = isDefined(rowNumber)
                ? valueFunction(rowNumber)
                : null;

              const color = colorMap.mapValueToColor(value);
              if (color === undefined) {
                return undefined;
              }

              return {
                fillStyle: color.toCssColorString(),
                strokeStyle: baseMapContrastColor,
                lineWidth: 1,
                lineJoin: "miter"
              };
            },
            subdomains: regionType.serverSubdomains,
            rectangle:
              Array.isArray(regionType.bbox) && regionType.bbox.length >= 4
                ? Rectangle.fromDegrees(
                    regionType.bbox[0],
                    regionType.bbox[1],
                    regionType.bbox[2],
                    regionType.bbox[3]
                  )
                : undefined,
            minimumZoom: regionType.serverMinZoom,
            maximumNativeZoom: regionType.serverMaxNativeZoom,
            maximumZoom: regionType.serverMaxZoom,
            uniqueIdProp: regionType.uniqueIdProp,
            featureInfoFunc: (feature: any) => {
              if (
                isDefined(input.style.regionColumn) &&
                isDefined(input.style.regionColumn.regionType) &&
                isDefined(input.style.regionColumn.regionType.regionProp)
              ) {
                const regionColumn = input.style.regionColumn;
                const regionType = regionColumn.regionType;

                if (!isDefined(regionType)) return undefined;

                const regionId = filterRows(
                  regionColumn.valuesAsRegions.regionIdToRowNumbersMap.get(
                    feature.properties[regionType.regionProp]
                  )
                );

                let d: JsonObject | null = isDefined(regionId)
                  ? this.getRowValues(regionId)
                  : null;

                if (d === null) return;

                return this.featureInfoFromFeature(
                  regionType,
                  d,
                  feature.properties[regionType.uniqueIdProp]
                );
              }

              return undefined;
            }
          }),
          show: this.show
        };
      }
    );

    private featureInfoFromFeature(
      region: RegionProvider,
      data: JsonObject,
      regionId: any
    ) {
      const featureInfo = new ImageryLayerFeatureInfo();
      if (isDefined(region.nameProp)) {
        featureInfo.name = data[region.nameProp] as string;
      }

      data.id = regionId;
      featureInfo.data = data;

      featureInfo.configureDescriptionFromProperties(data);
      featureInfo.configureNameFromProperties(data);
      return featureInfo;
    }

    private getRowValues(index: number): JsonObject {
      const result: JsonObject = {};

      this.tableColumns.forEach(column => {
        result[column.name] = column.values[index];
      });

      return result;
    }

    private readonly getTableColumn = createTransformer((index: number) => {
      return new TableColumn(this, index);
    });

    private readonly getTableStyle = createTransformer((index: number) => {
      return new TableStyle(this, index);
    });
  }

  return TableMixin;
}

namespace TableMixin {
  export interface TableMixin
    extends InstanceType<ReturnType<typeof TableMixin>> {}

  export function isMixedInto(model: any): model is TableMixin {
    return model && model.hasTableMixin;
  }
}

export default TableMixin;