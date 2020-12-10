import { configure, runInAction } from "mobx";
import _loadWithXhr from "../../lib/Core/loadWithXhr";
import Terria from "../../lib/Models/Terria";
import CkanCatalogGroup, {
  CkanServerStratum
} from "../../lib/Models/CkanCatalogGroup";
import CommonStrata from "../../lib/Models/CommonStrata";
import i18next from "i18next";
import CkanItemReference from "../../lib/Models/CkanItemReference";
import CatalogGroup from "../../lib/Models/CatalogGroupNew";
import WebMapServiceCatalogItem from "../../lib/Models/WebMapServiceCatalogItem";
import { BaseModel } from "../../lib/Models/Model";

configure({
  enforceActions: "observed",
  computedRequiresReaction: true
});

interface ExtendedLoadWithXhr {
  (): any;
  load: { (...args: any[]): any; calls: any };
}

const loadWithXhr: ExtendedLoadWithXhr = <any>_loadWithXhr;

describe("CkanCatalogGroup", function() {
  const ckanServerUrl = "http://data.gov.au";
  let terria: Terria;
  let ckanCatalogGroup: CkanCatalogGroup;
  let ckanServerStratum: CkanServerStratum;

  beforeEach(async function() {
    terria = new Terria({
      baseUrl: "./"
    });
    ckanCatalogGroup = new CkanCatalogGroup("test", terria);

    const realLoadWithXhr = loadWithXhr.load;
    // We replace calls to real servers with pre-captured JSON files so our testing is isolated, but reflects real data.
    spyOn(loadWithXhr, "load").and.callFake(function(...args: any[]) {
      args[0] = "test/CKAN/search-result.json";

      return realLoadWithXhr(...args);
    });
  });

  it("has a type and typeName", function() {
    expect(ckanCatalogGroup.type).toBe("ckan-group");
    expect(ckanCatalogGroup.typeName).toBe(i18next.t("models.ckan.nameServer"));
  });

  describe("after loading metadata - default settings - ", function() {
    beforeEach(async function() {
      runInAction(() => {
        ckanCatalogGroup.setTrait(
          "definition",
          "url",
          "test/CKAN/search-result.json"
        );
      });
      await ckanCatalogGroup.loadMembers();
      ckanServerStratum = <CkanServerStratum>(
        ckanCatalogGroup.strata.get(CkanServerStratum.stratumName)
      );
    });

    it("properly creates members", function() {
      expect(ckanCatalogGroup.members).toBeDefined();
      expect(ckanCatalogGroup.members.length).toBe(2);
      let member0 = <CatalogGroup>ckanCatalogGroup.memberModels[0];
      let member1 = <CatalogGroup>ckanCatalogGroup.memberModels[1];
      expect(member0.name).toBe("Department of the Environment and Energy");
      expect(member1.name).toBe("Murray-Darling Basin Authority");
    });

    it("properly creates groups", function() {
      if (ckanServerStratum !== undefined) {
        if (ckanServerStratum.groups) {
          // 3 groups because we add an Ungrouped Group
          expect(ckanServerStratum.groups.length).toBe(3);

          // 3 groups are sorted by name
          let group0 = <CatalogGroup>ckanServerStratum.groups[0];
          expect(group0.name).toBe("Department of the Environment and Energy");
          // There is only 1 resource on the 1 dataset
          expect(group0.members.length).toBe(1);

          let group1 = <CatalogGroup>ckanServerStratum.groups[1];
          expect(group1.name).toBe("Murray-Darling Basin Authority");
          // There are 2 resources on the 2 datasets
          expect(group1.members.length).toBe(6);

          let group2 = <CatalogGroup>ckanServerStratum.groups[2];
          expect(group2.name).toBe(ckanCatalogGroup.ungroupedTitle);
          expect(group2.name).toBe("No group");
          expect(group2.members.length).toBe(0);
        }
      }
    });
  });

  describe("after loading metadata - change some settings - ", function() {
    beforeEach(async function() {
      runInAction(() => {
        ckanCatalogGroup.setTrait(
          "definition",
          "url",
          "test/CKAN/search-result.json"
        );
        ckanCatalogGroup.setTrait("definition", "groupBy", "group");
        ckanCatalogGroup.setTrait("definition", "ungroupedTitle", "Blah");
        ckanCatalogGroup.setTrait("definition", "blacklist", ["Geography"]);
        ckanCatalogGroup.setTrait("definition", "itemProperties", {
          layers: "abc"
        });
      });
      await ckanCatalogGroup.loadMembers();
      ckanServerStratum = <CkanServerStratum>(
        ckanCatalogGroup.strata.get(CkanServerStratum.stratumName)
      );
    });

    it("properly creates members", function() {
      expect(ckanCatalogGroup.members).toBeDefined();
      expect(ckanCatalogGroup.members.length).toBe(3);
      let member0 = <CatalogGroup>ckanCatalogGroup.memberModels[0];
      expect(member0 instanceof CatalogGroup).toBeTruthy();
      expect(member0.name).toBe("Blah");
      let member1 = <CatalogGroup>ckanCatalogGroup.memberModels[1];
      expect(member1 instanceof CatalogGroup).toBeTruthy();
      expect(member1.name).toBe("Environment");
      let member2 = <CatalogGroup>ckanCatalogGroup.memberModels[2];
      expect(member2 instanceof CatalogGroup).toBeTruthy();
      expect(member2.name).toBe("Science");
    });

    it("Geography group has been filtered from the groups", function() {
      if (ckanServerStratum.groups && ckanServerStratum.filteredGroups) {
        expect(ckanServerStratum.groups.length).toBe(4);
        expect(ckanServerStratum.filteredGroups.length).toBe(3);
      }
    });

    it("itemProperties get added", async function() {
      const m = terria.getModelById(
        CkanItemReference,
        ckanCatalogGroup.uniqueId +
          "/66e3efa7-fb5c-4bd7-9478-74adb6277955/1dae2cfe-345b-4320-bf0c-4da0de061dc5"
      );
      expect(m).toBeDefined();
      if (m) {
        await m.loadReference();
        const target = m.target as WebMapServiceCatalogItem;
        expect(target).toBeDefined();
        if (target) {
          expect(target.layers).toBe("abc");
        }
      }
    });
  });
  describe("with item naming using", function() {
    beforeEach(async function() {
      runInAction(() => {
        ckanCatalogGroup.setTrait(
          "definition",
          "url",
          "test/CKAN/search-result.json"
        );
      });
    });

    it("useDatasetNameAndFormatWhereMultipleResources (the default)", async function() {
      await ckanCatalogGroup.loadMembers();
      ckanServerStratum = <CkanServerStratum>(
        ckanCatalogGroup.strata.get(CkanServerStratum.stratumName)
      );

      let group1 = <CatalogGroup>ckanCatalogGroup.memberModels[1];
      expect(
        group1.memberModels && group1.memberModels.length === 6
      ).toBeTruthy();
      if (group1.memberModels && group1.memberModels.length === 6) {
        const items = group1.memberModels as CkanItemReference[];
        expect(items[0].name).toBe(
          "Murray-Darling Basin Water Resource Plan Areas – Surface Water - KMZ"
        );
        expect(items[1].name).toBe(
          "Murray-Darling Basin Water Resource Plan Areas – Surface Water - WMS"
        );
      }
    });

    it("useCombinationNameWhereMultipleResources", async function() {
      runInAction(() => {
        ckanCatalogGroup.setTrait(
          "definition",
          "useCombinationNameWhereMultipleResources",
          true
        );
      });
      await ckanCatalogGroup.loadMembers();
      ckanServerStratum = <CkanServerStratum>(
        ckanCatalogGroup.strata.get(CkanServerStratum.stratumName)
      );

      let group1 = <CatalogGroup>ckanCatalogGroup.memberModels[1];
      expect(
        group1.memberModels && group1.memberModels.length === 6
      ).toBeTruthy();
      if (group1.memberModels && group1.memberModels.length === 6) {
        // These items include their Dataset name in their Resource name, so it's not the greatest demonstration
        //  of useCombinationNameWhereMultipleResources, but it works for an automated test
        const items = group1.memberModels as CkanItemReference[];
        expect(items[0].name).toBe(
          "Murray-Darling Basin Water Resource Plan Areas – Surface Water - Murray-Darling Basin Water Resource Plan Areas – Surface Water for Google Earth"
        );
        expect(items[1].name).toBe(
          "Murray-Darling Basin Water Resource Plan Areas – Surface Water - Murray-Darling Basin Water Resource Plan Areas – Surface Water - Preview this Dataset (WMS)"
        );
      }
    });

    it("useResourceName", async function() {
      runInAction(() => {
        ckanCatalogGroup.setTrait("definition", "useResourceName", true);
      });
      await ckanCatalogGroup.loadMembers();
      ckanServerStratum = <CkanServerStratum>(
        ckanCatalogGroup.strata.get(CkanServerStratum.stratumName)
      );

      let group1 = <CatalogGroup>ckanCatalogGroup.memberModels[1];
      expect(
        group1.memberModels && group1.memberModels.length === 6
      ).toBeTruthy();
      if (group1.memberModels && group1.memberModels.length === 6) {
        const items = group1.memberModels as CkanItemReference[];
        expect(items[0].name).toBe(
          "Murray-Darling Basin Water Resource Plan Areas – Surface Water for Google Earth"
        );
        expect(items[1].name).toBe(
          "Murray-Darling Basin Water Resource Plan Areas – Surface Water - Preview this Dataset (WMS)"
        );
      }
    });
  });
});
