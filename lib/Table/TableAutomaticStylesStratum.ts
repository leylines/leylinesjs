import { computed } from "mobx";
import { createTransformer } from "mobx-utils";
import filterOutUndefined from "../Core/filterOutUndefined";
import isDefined from "../Core/isDefined";
import { JsonObject } from "../Core/Json";
import ConstantColorMap from "../Map/ConstantColorMap";
import DiscreteColorMap from "../Map/DiscreteColorMap";
import EnumColorMap from "../Map/EnumColorMap";
import TableMixin from "../ModelMixins/TableMixin";
import createStratumInstance from "../Models/createStratumInstance";
import LoadableStratum from "../Models/LoadableStratum";
import { BaseModel } from "../Models/Model";
import StratumFromTraits from "../Models/StratumFromTraits";
import LegendTraits, { LegendItemTraits } from "../Traits/LegendTraits";
import TableChartStyleTraits, {
  TableChartLineStyleTraits
} from "../Traits/TableChartStyleTraits";
import TableColorStyleTraits from "../Traits/TableColorStyleTraits";
import TablePointSizeStyleTraits from "../Traits/TablePointSizeStyleTraits";
import TableStyleTraits from "../Traits/TableStyleTraits";
import TableTimeStyleTraits from "../Traits/TableTimeStyleTraits";
import TableTraits from "../Traits/TableTraits";
import TableColumnType from "./TableColumnType";
import TableStyle from "./TableStyle";

const DEFAULT_ID_COLUMN = "id";

interface TableCatalogItem
  extends InstanceType<ReturnType<typeof TableMixin>> {}

export default class TableAutomaticStylesStratum extends LoadableStratum(
  TableTraits
) {
  static stratumName = "automaticTableStyles";
  constructor(readonly catalogItem: TableCatalogItem) {
    super();
  }

  duplicateLoadableStratum(newModel: BaseModel): this {
    return new TableAutomaticStylesStratum(
      newModel as TableCatalogItem
    ) as this;
  }

  @computed
  get defaultStyle(): StratumFromTraits<TableStyleTraits> {
    // Use the default style to select the spatial key (lon/lat, region, none i.e. chart)
    // for all styles.
    const longitudeColumn = this.catalogItem.findFirstColumnByType(
      TableColumnType.longitude
    );
    const latitudeColumn = this.catalogItem.findFirstColumnByType(
      TableColumnType.latitude
    );
    const regionColumn = this.catalogItem.findFirstColumnByType(
      TableColumnType.region
    );

    const timeColumn = this.catalogItem.findFirstColumnByType(
      TableColumnType.time
    );

    // Set a default id column only when we also have a time column
    const idColumn =
      timeColumn && this.catalogItem.findColumnByName(DEFAULT_ID_COLUMN);

    if (
      regionColumn !== undefined ||
      (longitudeColumn !== undefined && latitudeColumn !== undefined)
    ) {
      return createStratumInstance(TableStyleTraits, {
        longitudeColumn:
          longitudeColumn && latitudeColumn ? longitudeColumn.name : undefined,
        latitudeColumn:
          longitudeColumn && latitudeColumn ? latitudeColumn.name : undefined,
        regionColumn: regionColumn ? regionColumn.name : undefined,
        time: createStratumInstance(TableTimeStyleTraits, {
          timeColumn: timeColumn?.name,
          idColumns: idColumn && [idColumn.name]
        })
      });
    }

    // This dataset isn't spatial, so see if we have a valid chart style
    if (this.defaultChartStyle) {
      return this.defaultChartStyle;
    }

    // Can't do much with this dataset.
    return createStratumInstance(TableStyleTraits);
  }

  @computed
  get defaultChartStyle(): StratumFromTraits<TableStyleTraits> | undefined {
    const scalarColumns = this.catalogItem.tableColumns.filter(
      column =>
        column.type === TableColumnType.scalar ||
        column.type === TableColumnType.time
    );

    if (scalarColumns.length >= 2) {
      return createStratumInstance(TableStyleTraits, {
        chart: createStratumInstance(TableChartStyleTraits, {
          xAxisColumn: scalarColumns[0].name,
          lines: scalarColumns.slice(1).map((column, i) =>
            createStratumInstance(TableChartLineStyleTraits, {
              yAxisColumn: column.name,
              isSelectedInWorkbench: i === 0 // activate only the first chart line by default
            })
          )
        })
      });
    }
  }

  @computed
  get styles(): StratumFromTraits<TableStyleTraits>[] {
    // Create a style to color by every scalar and enum.
    let columns = this.catalogItem.tableColumns.filter(
      column =>
        column.type === TableColumnType.scalar ||
        column.type === TableColumnType.enum ||
        column.type === TableColumnType.text
    );

    // If no styles for scalar, enum or text, try to create a style using region columns
    if (columns.length === 0) {
      columns = this.catalogItem.tableColumns.filter(
        column => column.type === TableColumnType.region
      );
    }

    return columns.map((column, i) =>
      createStratumInstance(TableStyleTraits, {
        id: column.name,
        color: createStratumInstance(TableColorStyleTraits, {
          colorColumn: column.name,
          legend: this._createLegendForColorStyle(i)
        }),
        pointSize: createStratumInstance(TablePointSizeStyleTraits, {
          pointSizeColumn: column.name
        })
      })
    );
  }

  @computed
  get initialTimeSource() {
    return "start";
  }

  private readonly _createLegendForColorStyle = createTransformer(
    (i: number) => {
      return new ColorStyleLegend(this.catalogItem, i);
    }
  );
}

export class ColorStyleLegend extends LoadableStratum(LegendTraits) {
  constructor(readonly catalogItem: TableCatalogItem, readonly index: number) {
    super();
  }

  duplicateLoadableStratum(newModel: BaseModel): this {
    return new ColorStyleLegend(
      newModel as TableCatalogItem,
      this.index
    ) as this;
  }

  @computed
  get items(): StratumFromTraits<LegendItemTraits>[] {
    const activeStyle = this.catalogItem.activeTableStyle;
    if (activeStyle === undefined) {
      return [];
    }

    const colorMap = activeStyle.colorMap;
    if (colorMap instanceof DiscreteColorMap) {
      return this._createLegendItemsFromDiscreteColorMap(activeStyle, colorMap);
    } else if (colorMap instanceof EnumColorMap) {
      return this._createLegendItemsFromEnumColorMap(activeStyle, colorMap);
    } else if (colorMap instanceof ConstantColorMap) {
      return this._createLegendItemsFromConstantColorMap(activeStyle, colorMap);
    }
    return [];
  }

  private _createLegendItemsFromDiscreteColorMap(
    activeStyle: TableStyle,
    colorMap: DiscreteColorMap
  ): StratumFromTraits<LegendItemTraits>[] {
    const colorColumn = activeStyle.colorColumn;
    const minimum =
      colorColumn && colorColumn.valuesAsNumbers.minimum !== undefined
        ? colorColumn.valuesAsNumbers.minimum
        : 0.0;

    const nullBin =
      colorColumn &&
      colorColumn.valuesAsNumbers.numberOfValidNumbers <
        colorColumn.valuesAsNumbers.values.length
        ? [
            createStratumInstance(LegendItemTraits, {
              color: activeStyle.colorTraits.nullColor || "rgba(0, 0, 0, 0)",
              addSpacingAbove: true,
              title: activeStyle.colorTraits.nullLabel || "(No value)"
            })
          ]
        : [];
    let numberFormatOptions: JsonObject | undefined = undefined;
    if (colorColumn !== undefined) {
      numberFormatOptions = colorColumn.traits.format
        ? colorColumn.traits.format
        : undefined;
    }
    return colorMap.maximums
      .map((maximum, i) => {
        const isBottom = i === 0;
        const formattedMin = isBottom
          ? this._formatValue(minimum, numberFormatOptions)
          : this._formatValue(colorMap.maximums[i - 1], numberFormatOptions);
        const formattedMax = this._formatValue(maximum, numberFormatOptions);
        return createStratumInstance(LegendItemTraits, {
          color: colorMap.colors[i].toCssColorString(),
          title: `${formattedMin} to ${formattedMax}`
          // titleBelow: isBottom ? minimum.toString() : undefined, // TODO: format value
          // titleAbove: maximum.toString() // TODO: format value
        });
      })
      .reverse()
      .concat(nullBin);
  }

  private _createLegendItemsFromEnumColorMap(
    activeStyle: TableStyle,
    colorMap: EnumColorMap
  ): StratumFromTraits<LegendItemTraits>[] {
    const colorColumn = activeStyle.colorColumn;
    const nullBin =
      colorColumn && colorColumn.uniqueValues.numberOfNulls > 0
        ? [
            createStratumInstance(LegendItemTraits, {
              color: activeStyle.colorTraits.nullColor || "rgba(0, 0, 0, 0)",
              addSpacingAbove: true,
              title: activeStyle.colorTraits.nullLabel || "(No value)"
            })
          ]
        : [];

    // Aggregate colours (don't show multiple legend items for the same colour)
    const colorMapValues = colorMap.values.reduce<{
      [color: string]: string[];
    }>((prev, current, i) => {
      const cssCol = colorMap.colors[i].toCssColorString();
      if (isDefined(prev[cssCol])) {
        prev[cssCol].push(current);
      } else {
        prev[cssCol] = [current];
      }
      return prev;
    }, {});

    return Object.entries(colorMapValues)
      .map(([color, multipleTitles]) =>
        createStratumInstance(LegendItemTraits, {
          multipleTitles,
          color
        })
      )
      .concat(nullBin);
  }

  private _createLegendItemsFromConstantColorMap(
    activeStyle: TableStyle,
    colorMap: ConstantColorMap
  ): StratumFromTraits<LegendItemTraits>[] {
    return [
      createStratumInstance(LegendItemTraits, {
        color: colorMap.color.toCssColorString(),
        title: colorMap.title
      })
    ];
  }

  private _formatValue(value: number, format: JsonObject | undefined): string {
    return Math.round(value).toLocaleString(undefined, format);
  }
}
