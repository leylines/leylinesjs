import { runInAction } from "mobx";
import Terria from "../../lib/Models/Terria";
import WebMapServiceCatalogItem from "../../lib/Models/WebMapServiceCatalogItem";
import updateModelFromJson from "../../lib/Models/updateModelFromJson";
import { BaseModel } from "../../lib/Models/Model";
import CommonStrata from "../../lib/Models/CommonStrata";
import CatalogGroup from "../../lib/Models/CatalogGroupNew";

describe("updateModelFromJson", function() {
  let model: BaseModel;

  describe("when replaceStratum is", function() {
    beforeEach(function() {
      model = new WebMapServiceCatalogItem("Test", new Terria());
      runInAction(() => {
        model.setTrait(CommonStrata.definition, "url", "A");
        model.setTrait(CommonStrata.definition, "name", "B");
        model.setTrait(CommonStrata.user, "name", "C");
      });
    });

    it("true then the stratum is replaced", function() {
      updateModelFromJson(model, CommonStrata.definition, { url: "Z" }, true);

      expect(model.getTrait(CommonStrata.definition, "url")).toBe("Z");
      expect(model.getTrait(CommonStrata.definition, "name")).toBeUndefined();
      expect(model.getTrait(CommonStrata.user, "name")).toBe("C");
    });

    it("false then the stratum is not replaced", function() {
      updateModelFromJson(model, CommonStrata.definition, { url: "Z" }, false);

      expect(model.getTrait(CommonStrata.definition, "url")).toBe("Z");
      expect(model.getTrait(CommonStrata.definition, "name")).toBe("B");
      expect(model.getTrait(CommonStrata.user, "name")).toBe("C");
    });

    it("not specified then the stratum is not replaced", function() {
      updateModelFromJson(model, CommonStrata.definition, { url: "Z" });

      expect(model.getTrait(CommonStrata.definition, "url")).toBe("Z");
      expect(model.getTrait(CommonStrata.definition, "name")).toBe("B");
      expect(model.getTrait(CommonStrata.user, "name")).toBe("C");
    });
  });

  describe("when id of group already exists", function() {
    let terria: Terria;

    beforeEach(function() {
      terria = new Terria({
        baseUrl: "./"
      });

      terria.catalog.userAddedDataGroup.addMembersFromJson(
        CommonStrata.definition,
        [
          {
            name: "TestGroup",
            type: "group",
            id: "testgroup",
            description: "This is a test group",
            members: [
              {
                id: "1",
                name: "TestWMS1",
                type: "wms",
                url: "test/WMS/single_metadata_url.xml"
              },
              {
                id: "2",
                name: "TestWMS2",
                type: "wms",
                url: "test/WMS/single_metadata_url.xml"
              }
            ]
          }
        ]
      );
    });

    it("updating the members trait should add new members to the existing members array", function() {
      const model = terria.getModelById(BaseModel, "testgroup")!;
      const newJson: any = {
        name: "TestGroup",
        type: "group",
        id: "testgroup",
        members: [
          {
            id: "3",
            name: "TestWMS3",
            type: "wms",
            url: "test/WMS/single_metadata_url.xml"
          }
        ]
      };

      updateModelFromJson(model, CommonStrata.definition, newJson);
      expect(
        (model.getTrait(CommonStrata.definition, "members") as any[]).length
      ).toBe(3);
      expect(
        model.getTrait(CommonStrata.definition, "members") as any[]
      ).toContain(newJson.members[0].id);
    });

    it("updating any other trait should replace the existing traits with the new trait", function() {
      const model = terria.getModelById(BaseModel, "testgroup")!;
      const newJson: any = {
        name: "NewTestGroup",
        type: "group",
        id: "testgroup",
        description: "This is another test group",
        members: [
          {
            id: "3",
            name: "TestWMS3",
            type: "wms",
            url: "test/WMS/single_metadata_url.xml"
          }
        ]
      };
      updateModelFromJson(model, CommonStrata.definition, newJson);
      expect(model.getTrait(CommonStrata.definition, "name")).toBe(
        newJson.name
      );
      expect(model.getTrait(CommonStrata.definition, "description")).toBe(
        newJson.description
      );
    });
  });
});
