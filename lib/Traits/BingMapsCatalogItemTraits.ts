import primitiveTrait from "./primitiveTrait";
import mixTraits from "./mixTraits";
import RasterLayerTraits from "./RasterLayerTraits";
import MappableTraits from "./MappableTraits";
import CatalogMemberTraits from "./CatalogMemberTraits";
import LayerOrderingTraits from "./LayerOrderingTraits";
import BingMapsStyle from "terriajs-cesium/Source/Scene/BingMapsStyle";

export default class BingMapsCatalogItemTraits extends mixTraits(
  LayerOrderingTraits,
  RasterLayerTraits,
  MappableTraits,
  CatalogMemberTraits
) {
  @primitiveTrait({
    type: "string",
    name: "Map style",
    description: "Type of Bing Maps imagery"
  })
  mapStyle?: BingMapsStyle;

  @primitiveTrait({
    type: "string",
    name: "Key",
    description: "The Bing Maps key"
  })
  key?: string;
}
