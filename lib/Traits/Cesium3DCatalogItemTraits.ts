import CatalogMemberTraits from "./CatalogMemberTraits";
import FeatureInfoTraits from "./FeatureInfoTraits";
import MappableTraits from "./MappableTraits";
import ShadowTraits from "./ShadowTraits";
import mixTraits from "./mixTraits";
import UrlTraits from "./UrlTraits";
import TransformationTraits from "./TransformationTraits";
import PlaceEditorTraits from "./PlaceEditorTraits";
import Cesium3DTilesTraits from "./Cesium3dTilesTraits";

export default class Cesium3DTilesCatalogItemTraits extends mixTraits(
  PlaceEditorTraits,
  TransformationTraits,
  FeatureInfoTraits,
  MappableTraits,
  UrlTraits,
  CatalogMemberTraits,
  ShadowTraits,
  Cesium3DTilesTraits
) {}
