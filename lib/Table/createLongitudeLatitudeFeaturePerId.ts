import groupBy from "lodash-es/groupBy";
import Cartesian3 from "terriajs-cesium/Source/Core/Cartesian3";
import Color from "terriajs-cesium/Source/Core/Color";
import Iso8601 from "terriajs-cesium/Source/Core/Iso8601";
import JulianDate from "terriajs-cesium/Source/Core/JulianDate";
import TimeInterval from "terriajs-cesium/Source/Core/TimeInterval";
import TimeIntervalCollection from "terriajs-cesium/Source/Core/TimeIntervalCollection";
import Entity from "terriajs-cesium/Source/DataSources/Entity";
import PointGraphics from "terriajs-cesium/Source/DataSources/PointGraphics";
import SampledPositionProperty from "terriajs-cesium/Source/DataSources/SampledPositionProperty";
import SampledProperty from "terriajs-cesium/Source/DataSources/SampledProperty";
import TimeIntervalCollectionPositionProperty from "terriajs-cesium/Source/DataSources/TimeIntervalCollectionPositionProperty";
import TimeIntervalCollectionProperty from "terriajs-cesium/Source/DataSources/TimeIntervalCollectionProperty";
import HeightReference from "terriajs-cesium/Source/Scene/HeightReference";
import PropertyBag from "terriajs-cesium/Source/DataSources/PropertyBag";
import { JsonObject } from "../Core/Json";
import TableColumn from "./TableColumn";
import TableColumnType from "./TableColumnType";
import TableStyle from "./TableStyle";
import Feature from "../Models/Feature";

type RequiredTableStyle = TableStyle & {
  longitudeColumn: TableColumn;
  latitudeColumn: TableColumn;
  timeColumn: TableColumn;
  idColumns: TableColumn[];
  timeIntervals: (JulianDate | null)[];
};

/**
 * Create lat/lon features, one for each id group in the table
 */
export default function createLongitudeLatitudeFeaturePerId(
  style: RequiredTableStyle
): Entity[] {
  // Group rows by id and create a feature per group
  const idColumns = style.idColumns;
  const rowIds = style.tableModel.rowIds;
  const groups = Object.entries(
    groupBy(rowIds, id => idColumns.map(col => col.values[id]).join("-"))
  );
  const features = groups.map(([featureId, rowIds]) =>
    createFeature(featureId, rowIds, style)
  );
  return features;
}

function createFeature(
  featureId: string,
  rowIds: number[],
  style: RequiredTableStyle
): Entity {
  const isSampled = style.timeTraits.isSampled;
  const tableHasScalarColumn = style.tableModel.tableColumns.find(
    col => col.type === TableColumnType.scalar
  );
  const shouldInterpolateColorAndSize = isSampled && tableHasScalarColumn;
  const position = isSampled
    ? new SampledPositionProperty()
    : new TimeIntervalCollectionPositionProperty();
  const color = shouldInterpolateColorAndSize
    ? new SampledProperty(Color)
    : new TimeIntervalCollectionProperty();
  const pointSize = shouldInterpolateColorAndSize
    ? new SampledProperty(Number)
    : new TimeIntervalCollectionProperty();
  const properties = new TimeIntervalCollectionProperty();
  const description = new TimeIntervalCollectionProperty();
  const outlineColor = Color.fromCssColorString(
    "black" //this.terria.baseMapContrastColor;
  );

  const longitudes = style.longitudeColumn.valuesAsNumbers.values;
  const latitudes = style.latitudeColumn.valuesAsNumbers.values;
  const timeIntervals = style.timeIntervals;
  const colorMap = style.colorMap;
  const pointSizeMap = style.pointSizeMap;
  const colorColumn = style.colorColumn;
  const valueFunction =
    colorColumn !== undefined ? colorColumn.valueFunctionForType : () => null;
  const availability = new TimeIntervalCollection();
  const tableColumns = style.tableModel.tableColumns;
  const chartColumns = style.tableModel.tableColumns.filter(
    col =>
      col.type !== TableColumnType.longitude &&
      col.type !== TableColumnType.latitude
  );
  const getChartDetails = () => ({
    title: featureId,
    csvData: [
      chartColumns.map(col => col.name).join(","),
      ...rowIds.map(i => chartColumns.map(col => col.values[i]).join(","))
    ].join("\n")
  });

  rowIds.forEach(rowId => {
    const longitude = longitudes[rowId];
    const latitude = latitudes[rowId];
    const interval = timeIntervals[rowId];
    const value = valueFunction(rowId);

    if (longitude === null || latitude === null || !interval) {
      return;
    }

    addSampleOrInterval(
      position,
      Cartesian3.fromDegrees(longitude, latitude, 0.0),
      interval
    );

    addSampleOrInterval(color, colorMap.mapValueToColor(value), interval);
    addSampleOrInterval(
      pointSize,
      pointSizeMap.mapValueToPointSize(value),
      interval
    );
    addSampleOrInterval(
      properties,
      {
        ...getRowValues(rowId, tableColumns),
        _terria_getChartDetails: getChartDetails
      },
      interval
    );
    addSampleOrInterval(
      description,
      getRowDescription(rowId, tableColumns),
      interval
    );
    availability.addInterval(interval);
  });

  const show = calculateShow(availability);
  const feature = new Feature({
    position,
    point: new PointGraphics({
      color: <any>color,
      outlineColor,
      pixelSize: <any>pointSize,
      show: <any>show,
      outlineWidth: 1,
      heightReference: HeightReference.CLAMP_TO_GROUND
    }),
    availability
  });
  feature.properties = new PropertyBag(properties);
  feature.description = description;
  return feature;
}

function addSampleOrInterval(
  property:
    | SampledProperty
    | SampledPositionProperty
    | TimeIntervalCollectionProperty
    | TimeIntervalCollectionPositionProperty,
  data: any,
  interval: TimeInterval
) {
  if (
    property instanceof SampledProperty ||
    property instanceof SampledPositionProperty
  ) {
    property.addSample(interval.start, data);
  } else {
    const thisInterval = interval.clone();
    thisInterval.data = data;
    property.intervals.addInterval(thisInterval);
  }
}

function calculateShow(availability: TimeIntervalCollection) {
  const show = new TimeIntervalCollectionProperty();
  if (availability.start) {
    const start = availability.start;
    const stop = availability.stop;
    show.intervals.addInterval(
      new TimeInterval({
        start: <any>Iso8601.MINIMUM_VALUE,
        stop: <any>Iso8601.MAXIMUM_VALUE,
        data: false
      })
    );
    show.intervals.addInterval(new TimeInterval({ start, stop, data: true }));
  } else {
    show.intervals.addInterval(
      new TimeInterval({
        start: <any>Iso8601.MINIMUM_VALUE,
        stop: <any>Iso8601.MAXIMUM_VALUE,
        data: true
      })
    );
  }
  return show;
}

function getRowValues(
  index: number,
  tableColumns: Readonly<TableColumn[]>
): JsonObject {
  const result: JsonObject = {};

  tableColumns.forEach(column => {
    result[column.name] = column.values[index];
  });

  return result;
}

function getRowDescription(
  index: number,
  tableColumns: Readonly<TableColumn[]>
) {
  const rows = tableColumns
    .map(column => {
      const title = column.title;
      const value = column.values[index];
      return `<tr><td>${title}</td><td>${value}</td></tr>`;
    })
    .join("\n");
  return `<table class="cesium-infoBox-defaultTable">${rows}</table>`;
}
