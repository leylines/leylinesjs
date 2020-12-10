import React from "react";
import Mustache from "mustache";

import createReactClass from "create-react-class";

import PropTypes from "prop-types";

import naturalSort from "javascript-natural-sort";
import parseCustomMarkdownToReact from "../Custom/parseCustomMarkdownToReact";
import { observer } from "mobx-react";

import Styles from "./data-preview.scss";
import MetadataTable from "./MetadataTable";

naturalSort.insensitive = true;
import { withTranslation } from "react-i18next";
import { item } from "../Custom/Chart/tooltip.scss";

Mustache.escape = function(string) {
  return string;
};

/**
 * CatalogItem-defined sections that sit within the preview description. These are ordered according to the catalog item's
 * order if available.
 */
const DataPreviewSections = observer(
  createReactClass({
    displayName: "DataPreviewSections",

    propTypes: {
      metadataItem: PropTypes.object.isRequired,
      t: PropTypes.func.isRequired
    },

    sortInfoSections(items) {
      const infoSectionOrder = this.props.metadataItem.infoSectionOrder;

      items.sort(function(a, b) {
        const aIndex = infoSectionOrder.indexOf(a.name);
        const bIndex = infoSectionOrder.indexOf(b.name);
        if (aIndex >= 0 && bIndex < 0) {
          return -1;
        } else if (aIndex < 0 && bIndex >= 0) {
          return 1;
        } else if (aIndex < 0 && bIndex < 0) {
          return naturalSort(a.name, b.name);
        }
        return aIndex - bIndex;
      });

      return items;
    },

    render() {
      const metadataItem = this.props.metadataItem;
      const items = metadataItem.hideSource
        ? metadataItem.infoWithoutSources
        : metadataItem.info.slice();

      return (
        <div>
          <For each="item" index="i" of={this.sortInfoSections(items)}>
            <Choose>
              <When condition={item.content?.length > 0}>
                <div key={i}>
                  <h4 className={Styles.h4}>{item.name}</h4>
                  {parseCustomMarkdownToReact(
                    Mustache.render(item.content, metadataItem),
                    {
                      catalogItem: metadataItem
                    }
                  )}
                </div>
              </When>
              <When condition={item.contentAsObject !== undefined}>
                <h4 className={Styles.h4}>{item.name}</h4>
                <MetadataTable metadataItem={item.contentAsObject} />
              </When>
            </Choose>
          </For>
        </div>
      );
    }
  })
);

export default withTranslation()(DataPreviewSections);
