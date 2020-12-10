import { runInAction } from "mobx";
import createGuid from "terriajs-cesium/Source/Core/createGuid";
import CommonStrata from "../../lib/Models/CommonStrata";
import SplitItemReference from "../../lib/Models/SplitItemReference";
import Terria from "../../lib/Models/Terria";
import WebMapServiceCatalogItem from "../../lib/Models/WebMapServiceCatalogItem";

describe("SplitItemReference", function() {
  it("can dereference the source item", async function() {
    const terria = new Terria();
    const splitRef = new SplitItemReference(createGuid(), terria);
    const sourceItem = new WebMapServiceCatalogItem(createGuid(), terria);
    terria.addModel(splitRef);
    terria.addModel(sourceItem);
    runInAction(() => {
      splitRef.setTrait(
        CommonStrata.user,
        "splitSourceItemId",
        sourceItem.uniqueId
      );
    });
    await splitRef.loadReference();
    expect(splitRef.target instanceof WebMapServiceCatalogItem).toBe(true);
  });
});
