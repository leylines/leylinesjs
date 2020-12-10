import CommonStrata from "../../lib/Models/CommonStrata";
import createStratumInstance from "../../lib/Models/createStratumInstance";
import CsvCatalogItem from "../../lib/Models/CsvCatalogItem";
import Terria from "../../lib/Models/Terria";
import TableColumn from "../../lib/Table/TableColumn";
import TableColumnTraits from "../../lib/Traits/TableColumnTraits";

describe("TableColumn", function() {
  let tableModel: CsvCatalogItem;

  beforeEach(function() {
    tableModel = new CsvCatalogItem("test", new Terria(), undefined);
  });

  describe("title", function() {
    it("correctly resolves the title", function() {
      const x = tableModel.addObject(CommonStrata.user, "columns", "Column0");
      x?.setTrait(CommonStrata.user, "title", "Time");
      const y = tableModel.addObject(CommonStrata.user, "columns", "Column1");
      y?.setTrait(CommonStrata.user, "title", "Speed");
      const tableColumn1 = new TableColumn(tableModel, 0);
      const tableColumn2 = new TableColumn(tableModel, 1);
      expect(tableColumn1.title).toBe("Time");
      expect(tableColumn2.title).toBe("Speed");
    });

    it("can resolve title from the `tableModel.columnTitles` if set", function() {
      tableModel.setTrait(CommonStrata.user, "columnTitles", ["Time", "Speed"]);
      const tableColumn1 = new TableColumn(tableModel, 0);
      const tableColumn2 = new TableColumn(tableModel, 1);
      expect(tableColumn1.title).toBe("Time");
      expect(tableColumn2.title).toBe("Speed");
    });
  });

  describe("units", function() {
    it("correctly resolves the units", function() {
      const x = tableModel.addObject(CommonStrata.user, "columns", "Column0");
      x?.setTrait(CommonStrata.user, "units", "ms");
      const y = tableModel.addObject(CommonStrata.user, "columns", "Column1");
      y?.setTrait(CommonStrata.user, "units", "kmph");
      const tableColumn1 = new TableColumn(tableModel, 0);
      const tableColumn2 = new TableColumn(tableModel, 1);
      expect(tableColumn1.units).toBe("ms");
      expect(tableColumn2.units).toBe("kmph");
    });

    it("can resolve unit from the `tableModel.columnUnits` if set", function() {
      tableModel.setTrait(CommonStrata.user, "columnUnits", ["ms", "kmph"]);
      const tableColumn1 = new TableColumn(tableModel, 0);
      const tableColumn2 = new TableColumn(tableModel, 1);
      expect(tableColumn1.units).toBe("ms");
      expect(tableColumn2.units).toBe("kmph");
    });
  });
});
