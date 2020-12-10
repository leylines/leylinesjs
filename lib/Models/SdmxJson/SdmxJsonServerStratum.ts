import i18next from "i18next";
import { action, computed } from "mobx";
import RequestErrorEvent from "terriajs-cesium/Source/Core/RequestErrorEvent";
import Resource from "terriajs-cesium/Source/Core/Resource";
import filterOutUndefined from "../../Core/filterOutUndefined";
import flatten from "../../Core/flatten";
import isDefined from "../../Core/isDefined";
import { regexMatches } from "../../Core/regexMatches";
import TerriaError from "../../Core/TerriaError";
import { InfoSectionTraits } from "../../Traits/CatalogMemberTraits";
import ModelReference from "../../Traits/ModelReference";
import SdmxCatalogGroupTraits from "../../Traits/SdmxCatalogGroupTraits";
import CatalogGroup from "../CatalogGroupNew";
import CommonStrata from "../CommonStrata";
import createStratumInstance from "../createStratumInstance";
import LoadableStratum from "../LoadableStratum";
import { BaseModel } from "../Model";
import proxyCatalogItemUrl from "../proxyCatalogItemUrl";
import StratumOrder from "../StratumOrder";
import SdmxCatalogGroup from "./SdmxJsonCatalogGroup";
import SdmxJsonCatalogItem from "./SdmxJsonCatalogItem";
import {
  Agency,
  AgencyScheme,
  AgencySchemes,
  Categorisations,
  Category,
  CategoryScheme,
  CategorySchemes,
  Dataflow,
  Dataflows,
  SdmxJsonStructureMessage
} from "./SdmxJsonStructureMessage";

export interface SdmxServer {
  agencySchemes?: AgencySchemes;
  categorySchemes?: CategorySchemes;
  categorisations?: Categorisations;
  dataflows: Dataflows;
}

export class SdmxServerStratum extends LoadableStratum(SdmxCatalogGroupTraits) {
  static stratumName = "sdmxServer";

  static async load(
    catalogGroup: SdmxCatalogGroup
  ): Promise<SdmxServerStratum> {
    // Load agency schemes (may be undefined)
    let agencySchemes = (
      await loadSdmxJsonStructure(
        proxyCatalogItemUrl(catalogGroup, `${catalogGroup.url}/agencyscheme/`),
        true
      )
    )?.data?.agencySchemes;

    // Load category schemes (may be undefined)
    let categorySchemeResponse = await loadSdmxJsonStructure(
      proxyCatalogItemUrl(
        catalogGroup,
        `${catalogGroup.url}/categoryscheme?references=parentsandsiblings`
      ),
      true
    );

    let dataflows = categorySchemeResponse?.data?.dataflows;

    // If no dataflows from category schemes -> try getting all of them through `dataflow` endpoint
    if (!isDefined(dataflows)) {
      dataflows = (
        await loadSdmxJsonStructure(
          proxyCatalogItemUrl(catalogGroup, `${catalogGroup.url}/dataflow/`),
          true
        )
      )?.data?.dataflows;

      if (!isDefined(dataflows)) {
        throw new TerriaError({
          title: i18next.t("models.sdmxServerStratum.loadDataErrorTitle"),
          message: i18next.t("models.sdmxServerStratum.loadDataErrorMessage")
        });
      }
    }

    return new SdmxServerStratum(catalogGroup, {
      agencySchemes,
      categorySchemes: categorySchemeResponse?.data?.categorySchemes,
      categorisations: categorySchemeResponse?.data?.categorisations,
      dataflows
    });
  }

  duplicateLoadableStratum(model: BaseModel): this {
    return new SdmxServerStratum(
      model as SdmxCatalogGroup,
      this.sdmxServer
    ) as this;
  }

  private readonly dataflowTree: DataflowTree = {};

  constructor(
    private readonly catalogGroup: SdmxCatalogGroup,
    private readonly sdmxServer: SdmxServer
  ) {
    super();

    // If categorisations exist => organise Dataflows into a tree!
    if (isDefined(this.sdmxServer.categorisations)) {
      this.sdmxServer.categorisations.forEach(categorisiation => {
        const categorySchemeUrn = parseSdmxUrn(categorisiation.target);

        const agencyId = categorySchemeUrn?.agencyId;
        const categorySchemeId = categorySchemeUrn?.resourceId;
        const categoryIds = categorySchemeUrn?.descendantIds; // Only support 1 level of categorisiation for now

        const dataflowId = parseSdmxUrn(categorisiation.source)?.resourceId;

        if (
          !isDefined(agencyId) ||
          !isDefined(categorySchemeId) ||
          !isDefined(categoryIds) ||
          !isDefined(dataflowId)
        )
          return;

        let agencyNode = this.dataflowTree[agencyId];

        // Create agency node if it doesn't exist
        if (!isDefined(agencyNode)) {
          const agency = this.getAgency(agencyId);
          if (!isDefined(agency)) return;

          this.dataflowTree[agencyId] = {
            type: "agencyScheme",
            item: agency,
            members: {}
          };

          agencyNode = this.dataflowTree[agencyId];
        }

        let categorySchemeNode = agencyNode.members![categorySchemeId];

        // Create categoryScheme node if it doesn't exist
        if (!isDefined(categorySchemeNode)) {
          const categoryScheme = this.getCategoryScheme(categorySchemeId);
          if (!isDefined(categoryScheme)) return;
          agencyNode.members![categorySchemeId] = {
            type: "categoryScheme",
            item: categoryScheme,
            members: {}
          };

          categorySchemeNode = agencyNode.members![categorySchemeId];
        }

        let categoryParentNode = categorySchemeNode;

        // Make category nodes (may be nested)
        categoryIds.forEach(categoryId => {
          // Create category node if it doesn't exist
          if (!isDefined(categoryParentNode.members![categoryId])) {
            const category = this.getCategory(categorySchemeId, categoryId);
            if (!isDefined(category)) return;
            categoryParentNode.members![categoryId] = {
              type: "category",
              item: category,
              members: {}
            };
          }
          // Swap parent node to newly created category node
          categoryParentNode = categoryParentNode.members![categoryId];
        });

        // Create dataflow!
        const dataflow = this.getDataflow(dataflowId);
        if (!isDefined(dataflow)) return;
        categoryParentNode.members![dataflowId] = {
          type: "dataflow",
          item: dataflow
        };
      });
      // No categorisations exist => add flat list of dataflows
    } else {
      this.dataflowTree = this.sdmxServer.dataflows.reduce<DataflowTree>(
        (tree, dataflow) => {
          if (isDefined(dataflow.id)) {
            tree[dataflow.id] = { type: "dataflow", item: dataflow };
          }
          return tree;
        },
        {}
      );
    }
  }

  @computed
  get members(): ModelReference[] {
    return Object.values(this.dataflowTree).map(node => this.getMemberId(node));
  }

  createMembers() {
    Object.values(this.dataflowTree).forEach(node =>
      this.createMemberFromLayer(node)
    );
  }

  @action
  createMemberFromLayer(node: DataflowTreeNode) {
    const layerId = this.getMemberId(node);

    if (!layerId) {
      return;
    }

    // If has nested layers -> create model for CatalogGroup
    if (node.members && Object.keys(node.members).length > 0) {
      // Create nested layers

      Object.values(node.members).forEach(member =>
        this.createMemberFromLayer(member)
      );

      // Create group
      const existingGroupModel = this.catalogGroup.terria.getModelById(
        CatalogGroup,
        layerId
      );

      let groupModel: CatalogGroup;
      if (existingGroupModel === undefined) {
        groupModel = new CatalogGroup(layerId, this.catalogGroup.terria);
        this.catalogGroup.terria.addModel(groupModel);
      } else {
        groupModel = existingGroupModel;
      }

      groupModel.setTrait(
        CommonStrata.underride,
        "name",
        node.item.name || node.item.id
      );
      groupModel.setTrait(
        CommonStrata.underride,
        "members",
        filterOutUndefined(
          Object.values(node.members).map(member => this.getMemberId(member))
        )
      );

      // Set group `info` trait if applicable
      if (node.item.description) {
        createStratumInstance(InfoSectionTraits, {
          name: "Description",
          content: node.item.description
        });
      }

      return;
    }

    // No nested layers (and type is dataflow) -> create model for SdmxJsonCatalogItem
    if (
      node.type !== "dataflow" ||
      !isDefined(node.item.id) ||
      !isDefined(node.item.agencyID)
    )
      return;

    const existingItemModel = this.catalogGroup.terria.getModelById(
      SdmxJsonCatalogItem,
      layerId
    );

    let itemModel: SdmxJsonCatalogItem;
    if (existingItemModel === undefined) {
      itemModel = new SdmxJsonCatalogItem(
        layerId,
        this.catalogGroup.terria,
        undefined
      );
      this.catalogGroup.terria.addModel(itemModel);
    } else {
      itemModel = existingItemModel;
    }

    // Replace the stratum inherited from the parent group.
    const stratum = CommonStrata.underride;

    itemModel.strata.delete(stratum);

    itemModel.setTrait(stratum, "name", node.item.name || node.item.id);
    itemModel.setTrait(stratum, "url", this.catalogGroup.url);

    itemModel.setTrait(stratum, "agencyId", node.item.agencyID as string);
    itemModel.setTrait(stratum, "dataflowId", node.item.id);

    itemModel.setTrait(
      stratum,
      "conceptOverrides",
      this.catalogGroup.traits.conceptOverrides.toJson(
        this.catalogGroup.conceptOverrides
      )
    );
  }

  getMemberId(node: DataflowTreeNode) {
    return `${this.catalogGroup.uniqueId}/${node.type}-${node.item.id}`;
  }

  getDataflow(id?: string) {
    if (!isDefined(id)) return;
    return this.sdmxServer.dataflows.find(d => d.id === id);
  }

  getCategoryScheme(id?: string) {
    if (!isDefined(id)) return;
    return this.sdmxServer.categorySchemes?.find(d => d.id === id);
  }

  getCategory(
    categoryScheme: CategoryScheme | string | undefined,
    id?: string
  ) {
    if (!isDefined(id)) return;
    let resolvedCategoryScheme =
      typeof categoryScheme === "string"
        ? this.getCategoryScheme(categoryScheme)
        : categoryScheme;

    return resolvedCategoryScheme?.categories?.find(d => d.id === id);
  }

  getAgency(id?: string) {
    if (!isDefined(id)) return;

    const agencies = this.sdmxServer.agencySchemes?.map(
      agencyScheme => agencyScheme.agencies
    );

    if (!isDefined(agencies)) return;

    return flatten(filterOutUndefined(agencies)).find(
      d => d.id === id
    ) as Agency;
  }
}

StratumOrder.addLoadStratum(SdmxServerStratum.stratumName);

export function parseSdmxUrn(urn?: string) {
  if (!isDefined(urn)) return;
  // Format urn:sdmx:org.sdmx.infomodel.xxx.xxx=AGENCY:RESOURCEID(VERSION).SUBRESOURCEID.SUBSUBRESOURCEID...
  // Example urn:sdmx:org.sdmx.infomodel.categoryscheme.Category=SPC:CAS_COM_TOPIC(1.0).ECO

  // Sub resource ID and (and sub sub...) are optional
  const matches = regexMatches(/.+=(.+):(.+)\((.+)\)\.*(.*)/g, urn);

  if (
    matches.length >= 1 &&
    matches[0].length >= 3 &&
    !isDefined([0, 1, 2].find(idx => matches[0][idx] === null))
  ) {
    return {
      agencyId: matches[0][0],
      resourceId: matches[0][1],
      version: matches[0][2],
      descendantIds:
        matches[0][3] !== null ? matches[0][3].split(".") : undefined
    };
  }
}

export async function loadSdmxJsonStructure(
  url: string,
  allowNotImplemeted: false
): Promise<SdmxJsonStructureMessage>;
export async function loadSdmxJsonStructure(
  url: string,
  allowNotImplemeted: true
): Promise<SdmxJsonStructureMessage | undefined>;
export async function loadSdmxJsonStructure(
  url: string,
  allowNotImplemeted: boolean
) {
  try {
    return JSON.parse(
      await new Resource({
        url,
        headers: {
          Accept:
            "application/vnd.sdmx.structure+json; charset=utf-8; version=1.0"
        }
      }).fetch()
    ) as SdmxJsonStructureMessage;
  } catch (error) {
    // If SDMX server has returned an error message
    if (error instanceof RequestErrorEvent && isDefined(error.response)) {
      if (!allowNotImplemeted) {
        throw new TerriaError({
          title: i18next.t(
            "models.sdmxServerStratum.sdmxStructureLoadErrorTitle"
          ),
          message: `${error.response}`
        });
      }
      // Not sure what happened (maybe CORS)
    } else if (!allowNotImplemeted) {
      throw new TerriaError({
        title: i18next.t(
          "models.sdmxServerStratum.sdmxStructureLoadErrorTitle"
        ),
        message: `Unkown error occurred${
          isDefined(error)
            ? typeof error === "string"
              ? `: ${error}`
              : `: ${JSON.stringify(error)}`
            : ""
        }`
      });
    }
  }
}

type DataflowTreeNodeBase<T, I> = {
  type: T;
  item: I;
  members?: DataflowTree;
};

type DataflowTreeNodeAgencyScheme = DataflowTreeNodeBase<
  "agencyScheme",
  AgencyScheme
>;
type DataflowTreeNodeCategoryScheme = DataflowTreeNodeBase<
  "categoryScheme",
  CategoryScheme
>;
type DataflowTreeNodeCategory = DataflowTreeNodeBase<"category", Category>;
type DataflowTreeNodeDataflow = DataflowTreeNodeBase<"dataflow", Dataflow>;

type DataflowTreeNode =
  | DataflowTreeNodeAgencyScheme
  | DataflowTreeNodeCategoryScheme
  | DataflowTreeNodeCategory
  | DataflowTreeNodeDataflow;

type DataflowTree = { [key: string]: DataflowTreeNode };

export enum SdmxHttpErrorCodes {
  // SDMX to HTTP Error Mapping - taken from https://github.com/sdmx-twg/sdmx-rest/blob/7366f56ac08fe4eed758204e32d2e1ca62c78acf/v2_1/ws/rest/docs/4_7_errors.md#sdmx-to-http-error-mapping
  NoChanges = 304,
  // 100 No results found = 404 Not found
  NoResults = 404,
  // 110 Unauthorized = 401 Unauthorized
  Unauthorized = 401,
  // 130 Response too large due to client request = 413 Request entity too large
  // 510 Response size exceeds service limit = 413 Request entity too large
  ReponseTooLarge = 413,
  // 140 Syntax error = 400 Bad syntax
  SyntaxError = 400,
  // 150 Semantic error = 403 Forbidden
  SemanticError = 403,
  UriTooLong = 414,
  // 500 Internal Server error = 500 Internal server error
  // 1000+ = 500 Internal server error
  ServerError = 500,
  // 501 Not implemented = 501 Not implemented
  NotImplemented = 501,
  // 503 Service unavailable = 503 Service unavailable
  ServiceUnavailable = 503
}
