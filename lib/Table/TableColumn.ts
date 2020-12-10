import countBy from "lodash-es/countBy";
import { computed } from "mobx";
import JSRegionProvider from "../Map/RegionProvider";
import JSRegionProviderList from "../Map/RegionProviderList";
import createCombinedModel from "../Models/createCombinedModel";
import Model from "../Models/Model";
import TableColumnTraits from "../Traits/TableColumnTraits";
import TableTraits from "../Traits/TableTraits";
import TableColumnType, { stringToTableColumnType } from "./TableColumnType";
import JulianDate from "terriajs-cesium/Source/Core/JulianDate";

// TypeScript 3.6.3 can't tell JSRegionProviderList is a class and reports
//   Cannot use namespace 'JSRegionProviderList' as a type.ts(2709)
// This is a dodgy workaround.
class RegionProviderList extends JSRegionProviderList {}
class RegionProvider extends JSRegionProvider {}

interface TableModel extends Model<TableTraits> {
  readonly dataColumnMajor: string[][] | undefined;
  readonly regionProviderList: RegionProviderList | undefined;
  readonly tableColumns: readonly TableColumn[];
}

export interface ColumnValuesAsNumbers {
  readonly values: ReadonlyArray<number | null>;
  readonly minimum: number | undefined;
  readonly maximum: number | undefined;
  readonly numberOfValidNumbers: number;
  readonly numberOfNonNumbers: number;
}

export interface ColumnValuesAsDates {
  readonly values: ReadonlyArray<Date | null>;
  readonly minimum: Date | undefined;
  readonly maximum: Date | undefined;
  readonly numberOfValidDates: number;
  readonly numberOfNonDates: number;
}

export interface ColumnValuesAsRegions {
  readonly regionIds: ReadonlyArray<string | null>;
  readonly numberOfValidRegions: number;
  readonly numberOfNonRegions: number;
  readonly numberOfRegionsWithMultipleRows: number;
  readonly regionIdToRowNumbersMap: ReadonlyMap<
    string,
    number | readonly number[]
  >;
}

export interface UniqueColumnValues {
  /**
   * Gets the unique values, ordered from most common to least common.
   */
  readonly values: ReadonlyArray<string>;

  /**
   * Gets the count of each value. This is a parallel array to
   * {@link #values}.
   */
  readonly counts: ReadonlyArray<number>;

  /**
   * Gets the number of rows with null values.
   */
  readonly numberOfNulls: number;
}

/**
 * A column of tabular data.
 */
export default class TableColumn {
  readonly columnNumber: number;
  readonly tableModel: TableModel;

  constructor(tableModel: TableModel, columnNumber: number) {
    this.columnNumber = columnNumber;
    this.tableModel = tableModel;
  }

  /**
   * Gets the raw, uninterpreted values in the column.
   */
  @computed
  get values(): readonly string[] {
    const result: string[] = [];

    if (this.tableModel.dataColumnMajor !== undefined) {
      // Copy all but the first element (which is the header), and trim along the way.
      const source = this.tableModel.dataColumnMajor[this.columnNumber];
      for (let i = 1; i < source.length; ++i) {
        result.push(source[i].trim());
      }
    }

    return result;
  }

  /**
   * Gets the column values as numbers, and returns information about how many
   * rows were successfully converted to numbers and the range of values.
   */
  @computed
  get valuesAsNumbers(): ColumnValuesAsNumbers {
    const numbers: (number | null)[] = [];
    let minimum = Number.MAX_VALUE;
    let maximum = -Number.MAX_VALUE;
    let numberOfValidNumbers = 0;
    let numberOfNonNumbers = 0;

    const replaceWithZero = this.traits.replaceWithZeroValues;
    const replaceWithNull = this.traits.replaceWithNullValues;

    const values = this.values;
    for (let i = 0; i < values.length; ++i) {
      const value = values[i];

      let n: number | null;
      if (replaceWithZero && replaceWithZero.indexOf(value) >= 0) {
        n = 0;
      } else if (replaceWithNull && replaceWithNull.indexOf(value) >= 0) {
        n = null;
      } else if (value.length === 0) {
        n = null;
      } else {
        n = toNumber(values[i]);
        if (n === null) {
          ++numberOfNonNumbers;
        }
      }

      if (n !== null) {
        ++numberOfValidNumbers;
        minimum = Math.min(minimum, n);
        maximum = Math.max(maximum, n);
      }

      numbers.push(n);
    }

    return {
      values: numbers,
      minimum: minimum === Number.MAX_VALUE ? undefined : minimum,
      maximum: maximum === -Number.MAX_VALUE ? undefined : maximum,
      numberOfValidNumbers: numberOfValidNumbers,
      numberOfNonNumbers: numberOfNonNumbers
    };
  }

  /**
   * Gets the column values as dates, and returns information about how many
   * rows were successfully converted to dates and the range of values.
   */
  @computed
  get valuesAsDates(): ColumnValuesAsDates {
    // See ECMA-262 section 15.9.1.1
    // http://ecma-international.org/ecma-262/5.1/#sec-15.9.1.1
    const maxDate = new Date(8.64e15);
    const minDate = new Date(-8.64e15);

    const dates: (Date | null)[] = [];
    let minimum = maxDate;
    let maximum = minDate;
    let numberOfValidDates = 0;
    let numberOfNonDates = 0;

    const replaceWithNull = this.traits.replaceWithNullValues;

    const values = this.values;
    for (let i = 0; i < values.length; ++i) {
      const value = values[i];

      let d: Date | null;
      if (replaceWithNull && replaceWithNull.indexOf(value) >= 0) {
        d = null;
      } else if (value.length === 0) {
        d = null;
      } else {
        d = toDate(values[i]);
        if (d === null) {
          ++numberOfNonDates;
        }
      }

      if (d !== null) {
        ++numberOfValidDates;
        minimum = d < minimum ? d : minimum;
        maximum = d > maximum ? d : maximum;
      }

      dates.push(d);
    }

    return {
      values: dates,
      minimum: minimum === maxDate ? undefined : minimum,
      maximum: maximum === minDate ? undefined : maximum,
      numberOfValidDates: numberOfValidDates,
      numberOfNonDates: numberOfNonDates
    };
  }

  @computed
  get valuesAsJulianDates() {
    const valuesAsDates = this.valuesAsDates;
    return {
      ...this.valuesAsDates,
      values: valuesAsDates.values.map(
        date => date && JulianDate.fromDate(date)
      ),
      minimum:
        valuesAsDates.minimum && JulianDate.fromDate(valuesAsDates.minimum),
      maximum:
        valuesAsDates.maximum && JulianDate.fromDate(valuesAsDates.maximum)
    };
  }

  /**
   * Gets the unique values in this column.
   */
  @computed
  get uniqueValues(): UniqueColumnValues {
    const replaceWithNull = this.traits.replaceWithNullValues;

    const values = this.values.map(value => {
      if (value.length === 0) {
        return "";
      } else if (replaceWithNull && replaceWithNull.indexOf(value) >= 0) {
        return "";
      }
      return value;
    });

    const count = countBy(values);
    const nullCount = count[""];
    delete count[""];

    function toArray(key: string, value: number): [string, number] {
      return [key, value];
    }
    const countArray = Object.keys(count).map(key => toArray(key, count[key]));

    countArray.sort(function(a, b) {
      return b[1] - a[1];
    });

    return {
      values: countArray.map(a => a[0]),
      counts: countArray.map(a => a[1]),
      numberOfNulls: nullCount
    };
  }

  @computed
  get valuesAsRegions(): ColumnValuesAsRegions {
    const values = this.values;
    const map = new Map<string, number | number[]>();

    const regionType = this.regionType;
    if (regionType === undefined) {
      // No regions.
      return {
        numberOfValidRegions: 0,
        numberOfNonRegions: values.length,
        numberOfRegionsWithMultipleRows: 0,
        regionIds: values.map(() => null),
        regionIdToRowNumbersMap: map
      };
    }

    const regionIds: (string | null)[] = [];
    let numberOfValidRegions = 0;
    let numberOfNonRegions = 0;
    let numberOfRegionsWithMultipleRows = 0;

    for (let i = 0; i < values.length; ++i) {
      const value = values[i];
      const regionId: string | null = this.findMatchingRegion(
        regionType,
        value
      );
      regionIds.push(regionId);

      if (regionId !== null) {
        ++numberOfValidRegions;

        const rows = map.get(regionId);
        if (rows === undefined) {
          map.set(regionId, i);
        } else if (typeof rows === "number") {
          numberOfRegionsWithMultipleRows++;
          map.set(regionId, [rows, i]);
        } else {
          rows.push(i);
        }
      } else {
        ++numberOfNonRegions;
      }
    }

    return {
      regionIds: regionIds,
      regionIdToRowNumbersMap: map,
      numberOfValidRegions: numberOfValidRegions,
      numberOfNonRegions: numberOfNonRegions,
      numberOfRegionsWithMultipleRows: numberOfRegionsWithMultipleRows
    };
  }

  findMatchingRegion(
    regionType: RegionProvider,
    rowValue: string
  ): string | null {
    // TODO: validate that the rowValue is actually a valid region, if possible.
    // TODO: implement replacements
    return rowValue.length > 0 ? rowValue.toLowerCase() : null;
  }

  /**
   * Gets the name of this column. If the column's name is blank, this property
   * will return `Column#` where `#` is the zero-based index of the column.
   */
  @computed
  get name(): string {
    const data = this.tableModel.dataColumnMajor;
    if (
      data === undefined ||
      data.length < this.columnNumber ||
      data[this.columnNumber].length < 1 ||
      data[this.columnNumber].length === 0
    ) {
      return "Column" + this.columnNumber;
    }
    return data[this.columnNumber][0];
  }

  @computed
  get title(): string {
    return this.tableModel.columnTitles[this.columnNumber]
      ? this.tableModel.columnTitles[this.columnNumber]
      : this.traits.title || this.name;
  }

  @computed
  get units(): string | undefined {
    return this.tableModel.columnUnits[this.columnNumber]
      ? this.tableModel.columnUnits[this.columnNumber]
      : this.traits.units;
  }

  /**
   * Gets the {@link TableColumnTraits} for this column. The trait are derived
   * from the default column plus this column layered on top of the default.
   */
  @computed
  get traits(): Model<TableColumnTraits> {
    // It is important to match on column name and not column number because the column numbers can vary between stratum
    const thisColumn = this.tableModel.columns.find(
      column => column.name === this.name
    );
    if (thisColumn !== undefined) {
      const result = createCombinedModel(
        thisColumn,
        this.tableModel.defaultColumn
      );
      return result;
    } else {
      return this.tableModel.defaultColumn;
    }
  }

  /**
   * Gets the type of this column. If {@link #traits} has an explicit
   * {@link TableColumnTraits#type} specified, it is returned directly.
   * Otherwise, the type is guessed from the column name and contents.
   */
  @computed
  get type(): TableColumnType {
    // Use the explicit column type, if any.
    let type: TableColumnType | undefined;
    if (this.traits.type !== undefined) {
      type = stringToTableColumnType(this.traits.type);
    }

    if (type === undefined && this.regionType !== undefined) {
      type = TableColumnType.region;
    }

    if (type === undefined) {
      type = this.guessColumnTypeFromName(this.name);
    }

    if (type === undefined) {
      // No hints from the name, so this column is: a scalar (number), an
      // enumeration, or arbitrary text (e.g. a description).

      // We'll treat it as a scalar if _most_ of values can be successfully
      // parsed as numbers, i.e. the number of successful parsings is ~10x
      // the number of failed parsings. Note that replacements with null
      // or zero are counted as neither failed nor successful.

      const numbers = this.valuesAsNumbers;
      if (
        numbers.numberOfNonNumbers <=
        Math.ceil(numbers.numberOfValidNumbers * 0.1)
      ) {
        type = TableColumnType.scalar;
      } else {
        // Lots of strings that can't be parsed as numbers.
        // If there are relatively few different values, treat it as an enumeration.
        // If there are heaps of different values, treat it as just ordinary
        // free-form text.
        const uniqueValues = this.uniqueValues.values;
        if (
          uniqueValues.length <= 7 ||
          uniqueValues.length < this.values.length / 10
        ) {
          type = TableColumnType.enum;
        } else {
          type = TableColumnType.text;
        }
      }
    }

    return type;
  }

  @computed
  get regionType(): RegionProvider | undefined {
    const regions = this.tableModel.regionProviderList;
    if (regions === undefined) {
      return undefined;
    }

    const regionType = this.traits.regionType;
    if (regionType !== undefined) {
      // Explicit region type specified, we just need to resolve it.
      return regions.getRegionProvider(regionType);
    }

    // No region type specified, so match the column name against the region
    // aliases.
    const details = regions.getRegionDetails([this.name], undefined, undefined);
    if (details.length > 0) {
      return details[0].regionProvider;
    }

    return undefined;
  }

  @computed
  get regionDisambiguationColumn(): TableColumn | undefined {
    if (this.regionType === undefined) {
      return undefined;
    }

    const columnName = this.traits.regionDisambiguationColumn;
    if (columnName !== undefined) {
      // Resolve the explicit disambiguation column.
      return this.tableModel.tableColumns.find(
        column => column.name === columnName
      );
    }

    // See if the region provider likes any of the table's other columns for
    // disambiguation.
    const disambigName = (<any>this.regionType).findDisambigVariable(
      this.tableModel.tableColumns.map(column => column.name)
    );
    if (disambigName === undefined) {
      return undefined;
    }

    return this.tableModel.tableColumns.find(
      column => column.name === disambigName
    );
  }

  /**
   * Gets a function that can be used to retrieve the value of this column for
   * a given row as a type appropriate for the column {@link #type}. For
   * example, if {@link #type} is {@link TableColumnType#scalar}, the value
   * will be a number or null.
   */
  @computed
  get valueFunctionForType(): (rowIndex: number) => string | number | null {
    if (this.type === TableColumnType.scalar) {
      const values = this.valuesAsNumbers.values;
      return function(rowIndex: number) {
        return values[rowIndex];
      };
    }

    const values = this.values;
    return function(rowIndex: number) {
      return values[rowIndex];
    };
  }

  @computed
  get scaledValueFunctionForType(): (rowIndex: number) => number | null {
    if (this.type === TableColumnType.scalar) {
      const valuesAsNumbers = this.valuesAsNumbers;
      const minimum = valuesAsNumbers.minimum;
      const maximum = valuesAsNumbers.maximum;

      if (minimum === undefined || maximum === undefined) {
        return nullFunction;
      }

      const delta = maximum - minimum;
      if (delta === 0.0) {
        return nullFunction;
      }

      const values = valuesAsNumbers.values;
      return function(rowIndex: number) {
        const value = values[rowIndex];
        if (value === null) {
          return null;
        }
        return (value - minimum) / delta;
      };
    }

    return nullFunction;
  }

  private guessColumnTypeFromName(name: string): TableColumnType | undefined {
    const typeHintSet = [
      { hint: /^(lon|long|longitude|lng)$/i, type: TableColumnType.longitude },
      { hint: /^(lat|latitude)$/i, type: TableColumnType.latitude },
      { hint: /^(address|addr)$/i, type: TableColumnType.address },
      {
        hint: /^(.*[_ ])?(depth|height|elevation|altitude)$/i,
        type: TableColumnType.height
      },
      { hint: /^(.*[_ ])?(time|date)/i, type: TableColumnType.time }, // Quite general, eg. matches "Start date (AEST)".
      { hint: /^(year)$/i, type: TableColumnType.time } // Match "year" only, not "Final year" or "0-4 years".
    ];

    const match = typeHintSet.find(hint => hint.hint.test(name));
    if (match !== undefined) {
      return match.type;
    }
    return undefined;
  }
}

const allCommas = /,/g;

function toNumber(value: string): number | null {
  // Remove commas and try to parse as a number.
  const withoutCommas = value.replace(allCommas, "");
  if (withoutCommas.length === 0) {
    // Treat an empty string as not a number rather than as zero.
    return null;
  }

  // `Number()` requires that the entire string form a number, unlike
  // parseInt and parseFloat which allow extra non-number characters
  // at the end.
  const asNumber = Number(withoutCommas);
  if (!Number.isNaN(asNumber)) {
    return asNumber;
  }
  return null;
}

function toDate(value: string): Date | null {
  // TODO: Add much more sophisticated date parsing from old TableColumn.convertToDates.
  const ms = Date.parse(value);
  if (!Number.isNaN(ms)) {
    return new Date(ms);
  }
  return null;
}

function nullFunction(rowIndex: number) {
  return null;
}
