import { JsonObject } from "../Core/Json";
import anyTrait from "./anyTrait";
import CatalogMemberTraits from "./CatalogMemberTraits";
import DataCustodianTraits from "./DataCustodianTraits";
import GetCapabilitiesTraits from "./GetCapabilitiesTraits";
import GroupTraits from "./GroupTraits";
import mixTraits from "./mixTraits";
import primitiveTrait from "./primitiveTrait";
import UrlTraits from "./UrlTraits";

export default class WebMapServiceCatalogGroupTraits extends mixTraits(
  DataCustodianTraits,
  GetCapabilitiesTraits,
  GroupTraits,
  UrlTraits,
  CatalogMemberTraits
) {
  @primitiveTrait({
    type: "boolean",
    name: "Flatten",
    description:
      "True to flatten the layers into a single list; false to use the layer hierarchy."
  })
  flatten?: boolean;

  @anyTrait({
    name: "Item Properties",
    description: "Sets traits on child WebMapServiceCatalogItem's"
  })
  itemProperties?: JsonObject;
}
