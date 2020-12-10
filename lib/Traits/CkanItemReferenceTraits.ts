import { JsonObject } from "../Core/Json";
import anyTrait from "./anyTrait";
import CkanSharedTraits from "./CkanSharedTraits";
import CatalogMemberReferenceTraits from "./CatalogMemberReferenceTraits";
import CkanCatalogGroupTraits from "./CkanCatalogGroupTraits";
import CkanResourceFormatTraits from "./CkanResourceFormatTraits";
import mixTraits from "./mixTraits";
import CatalogMemberTraits from "./CatalogMemberTraits";
import MappableTraits from "./MappableTraits";
import DataCustodianTraits from "./DataCustodianTraits";
import objectArrayTrait from "./objectArrayTrait";
import primitiveTrait from "./primitiveTrait";
import UrlTraits from "./UrlTraits";

export default class CkanCatalogItemTraits extends mixTraits(
  UrlTraits,
  DataCustodianTraits,
  MappableTraits,
  CkanSharedTraits,
  CatalogMemberReferenceTraits
) {
  @primitiveTrait({
    name: "Dataset ID",
    description: "The CKAN ID of the dataset.",
    type: "string"
  })
  datasetId?: string;

  @primitiveTrait({
    name: "Magda Record Data",
    description: "The Resource ID of the dataset to use",
    type: "string"
  })
  resourceId?: string;
}
