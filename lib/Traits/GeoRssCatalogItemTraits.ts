import mixTraits from "./mixTraits";
import FeatureInfoTraits from "./FeatureInfoTraits";
import UrlTraits from "./UrlTraits";
import MappableTraits from "./MappableTraits";
import CatalogMemberTraits from "./CatalogMemberTraits";
import primitiveTrait from "./primitiveTrait";

export default class GeoRssCatalogItemTraits extends mixTraits(
  FeatureInfoTraits,
  UrlTraits,
  MappableTraits,
  CatalogMemberTraits
) {
  @primitiveTrait({
    type: "boolean",
    name: "Clamp to Ground",
    description:
      "Whether the features in this service should be clamped to the terrain surface."
  })
  clampToGround: boolean = true;
  @primitiveTrait({
    type: "string",
    name: "geoRssString",
    description: "A GeoRSSstring"
  })
  geoRssString?: string;
}
