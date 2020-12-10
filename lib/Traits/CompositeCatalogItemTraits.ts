import mixTraits from "./mixTraits";
import CatalogMemberTraits from "./CatalogMemberTraits";
import MappableTraits from "./MappableTraits";
import modelReferenceArrayTrait from "./modelReferenceArrayTrait";
import CatalogMemberFactory from "../Models/CatalogMemberFactory";
import ModelReference from "./ModelReference";

export default class CompositeCatalogItemTraits extends mixTraits(
  MappableTraits,
  CatalogMemberTraits
) {
  @modelReferenceArrayTrait({
    name: "Members",
    description: "The members of this composite.",
    factory: CatalogMemberFactory
  })
  members: ModelReference[] = [];
}
