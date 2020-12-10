import Cartesian3 from "terriajs-cesium/Source/Core/Cartesian3";
import Color from "terriajs-cesium/Source/Core/Color";
import TimeIntervalCollection from "terriajs-cesium/Source/Core/TimeIntervalCollection";
import Entity from "terriajs-cesium/Source/DataSources/Entity";
import PointGraphics from "terriajs-cesium/Source/DataSources/PointGraphics";
import HeightReference from "terriajs-cesium/Source/Scene/HeightReference";
import filterOutUndefined from "../Core/filterOutUndefined";
import { JsonObject } from "../Core/Json";
import TableColumn from "./TableColumn";
import TableStyle from "./TableStyle";
import PropertyBag from "terriajs-cesium/Source/DataSources/PropertyBag";
import ConstantPositionProperty from "terriajs-cesium/Source/DataSources/ConstantPositionProperty";
import ConstantProperty from "terriajs-cesium/Source/DataSources/ConstantProperty";

type RequiredTableStyle = TableStyle & {
  longitudeColumn: TableColumn;
  latitudeColumn: TableColumn;
};

export default function createLongitudeLatitudeFeaturePerRow(
  style: RequiredTableStyle
): Entity[] {
  const longitudes = style.longitudeColumn.valuesAsNumbers.values;
  const latitudes = style.latitudeColumn.valuesAsNumbers.values;
  const colorColumn = style.colorColumn;
  const valueFunction =
    colorColumn !== undefined ? colorColumn.valueFunctionForType : () => null;
  const colorMap = style.colorMap;
  const pointSizeMap = style.pointSizeMap;
  const outlineColor = Color.fromCssColorString(
    "black" //this.terria.baseMapContrastColor;
  );
  const tableColumns = style.tableModel.tableColumns;
  const intervals = style.timeIntervals || [];
  const rowIds = style.tableModel.rowIds;
  return filterOutUndefined(
    rowIds.map(rowId => {
      const longitude = longitudes[rowId];
      const latitude = latitudes[rowId];
      if (longitude === null || latitude === null) {
        return;
      }
      const value = valueFunction(rowId);
      const feature = new Entity({
        position: new ConstantPositionProperty(
          Cartesian3.fromDegrees(longitude, latitude, 0.0)
        ),
        point: new PointGraphics({
          color: new ConstantProperty(colorMap.mapValueToColor(value)),
          pixelSize: new ConstantProperty(
            pointSizeMap.mapValueToPointSize(value)
          ),
          outlineWidth: new ConstantProperty(1),
          outlineColor: new ConstantProperty(outlineColor),
          heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND)
        })
      });
      const timeInterval = intervals[rowId];
      if (timeInterval)
        feature.availability = new TimeIntervalCollection([timeInterval]);
      feature.properties = new PropertyBag(getRowValues(rowId, tableColumns));
      return feature;
    })
  );
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
