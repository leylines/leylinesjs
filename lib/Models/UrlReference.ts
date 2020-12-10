import ReferenceMixin from "../ModelMixins/ReferenceMixin";
import UrlMixin from "../ModelMixins/UrlMixin";
import CatalogMemberFactory from "./CatalogMemberFactory";
import CreateModel from "./CreateModel";
import { BaseModel } from "./Model";
import StratumFromTraits from "./StratumFromTraits";
import Terria from "./Terria";
import ModelTraits from "../Traits/ModelTraits";
import UrlReferenceTraits from "../Traits/UrlReferenceTraits";
import StratumOrder from "./StratumOrder";
import CatalogMemberMixin from "../ModelMixins/CatalogMemberMixin";
import updateModelFromJson from "./updateModelFromJson";

const urlRecordStratum = "url-record";
StratumOrder.addDefaultStratum(urlRecordStratum);

export default class UrlReference extends UrlMixin(
  ReferenceMixin(CreateModel(UrlReferenceTraits))
) {
  static readonly type = "url-reference";

  get type() {
    return UrlReference.type;
  }

  constructor(
    id: string | undefined,
    terria: Terria,
    sourceReference?: BaseModel,
    strata?: Map<string, StratumFromTraits<ModelTraits>>
  ) {
    super(id, terria, sourceReference, strata);
  }

  protected forceLoadReference(
    previousTarget: BaseModel | undefined
  ): Promise<BaseModel | undefined> {
    if (this.url === undefined || this.uniqueId === undefined) {
      return Promise.resolve(undefined);
    }

    const target = UrlReference.createCatalogMemberFromUrlReference(
      this,
      this.uniqueId,
      this.url,
      this.terria,
      this.allowLoad || false
    );

    return Promise.resolve(target);
  }

  private static createCatalogMemberFromUrlReference(
    sourceReference: BaseModel,
    id: string,
    url: string,
    terria: Terria,
    allowLoad: boolean,
    _index?: number
  ): Promise<BaseModel | undefined> {
    const index = _index || 0;
    if (index >= UrlToCatalogMemberMapping.mapping.length) {
      return Promise.resolve(undefined);
    }

    if (
      (UrlToCatalogMemberMapping.mapping[index].matcher &&
        !UrlToCatalogMemberMapping.mapping[index].matcher(url)) ||
      (UrlToCatalogMemberMapping.mapping[index].requiresLoad && !allowLoad)
    ) {
      return UrlReference.createCatalogMemberFromUrlReference(
        sourceReference,
        id,
        url,
        terria,
        allowLoad,
        index + 1
      );
    } else {
      const item = CatalogMemberFactory.create(
        UrlToCatalogMemberMapping.mapping[index].type,
        sourceReference.uniqueId,
        terria,
        sourceReference
      );

      if (item === undefined) {
        return UrlReference.createCatalogMemberFromUrlReference(
          sourceReference,
          id,
          url,
          terria,
          allowLoad,
          index + 1
        );
      }

      updateModelFromJson(item, urlRecordStratum, {
        name: url,
        url: url
      });

      if (allowLoad && CatalogMemberMixin.isMixedInto(item)) {
        return item
          .loadMetadata()
          .then(() => item)
          .catch(e => {
            return UrlReference.createCatalogMemberFromUrlReference(
              sourceReference,
              id,
              url,
              terria,
              allowLoad,
              index + 1
            );
          });
      } else {
        return Promise.resolve(item);
      }
    }
  }
}

export type Matcher = (input: string) => boolean;

export interface MappingEntry {
  matcher: Matcher;
  type: string;
  requiresLoad: boolean;
}

export class UrlMapping {
  mapping: MappingEntry[] = [];

  register(matcher: Matcher, type: string, requiresLoad?: boolean) {
    this.mapping.push({
      matcher,
      type,
      requiresLoad: Boolean(requiresLoad)
    });
  }
}

export const UrlToCatalogMemberMapping = new UrlMapping();
