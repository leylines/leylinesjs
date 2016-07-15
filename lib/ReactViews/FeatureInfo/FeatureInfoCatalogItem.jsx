import defined from 'terriajs-cesium/Source/Core/defined';
import FeatureInfoSection from './FeatureInfoSection.jsx';
import ObserveModelMixin from '../ObserveModelMixin';
import React from 'react';

import Styles from './feature-info-catalog-item.scss';

// Any Catalog in a feature-info-panel
const FeatureInfoCatalogItem = React.createClass({
    mixins: [ObserveModelMixin],

    propTypes: {
        features: React.PropTypes.array,
        catalogItem: React.PropTypes.object,
        terria: React.PropTypes.object.isRequired,
        viewState: React.PropTypes.object.isRequired,
        onToggleOpen: React.PropTypes.func.isRequired
    },

    render() {
        const features = this.props.features;
        const catalogItem = this.props.catalogItem;
        const terria = this.props.terria;

        let featureInfoSections = null;
        let featureInfoTemplate;
        let totalFeaturesCount = 0;
        let hiddenNumber;
        let maximumShownFeatureInfos = terria.configParameters.defaultMaximumShownFeatureInfos;

        if (defined(features)) {
            // Display no more than defined number of feature infos
            totalFeaturesCount = features.length;
            if (defined(catalogItem)) {
                maximumShownFeatureInfos = catalogItem.maximumShownFeatureInfos;
                featureInfoTemplate = catalogItem.featureInfoTemplate;
            }
            hiddenNumber = totalFeaturesCount - maximumShownFeatureInfos;  // A positive hiddenNumber => some are hidden; negative means none are.
            featureInfoSections = features.slice(0, maximumShownFeatureInfos).map((feature, i) => {
                return (
                    <FeatureInfoSection key={i}
                        viewState={this.props.viewState}
                        catalogItem={catalogItem}
                        feature={feature}
                        position={terria.pickedFeatures && terria.pickedFeatures.pickPosition}
                        clock={terria.clock}
                        template={featureInfoTemplate}
                        isOpen={feature === terria.selectedFeature}
                        onClickHeader={this.props.onToggleOpen}
                    />
                );
            });

        }

        return (
            <li className={Styles.group}>
                <ul className={Styles.sections}>
                    <If condition={hiddenNumber === 1}>
                        <li className={Styles.messageItem}>
                            More than {maximumShownFeatureInfos} {catalogItem.name} features were found. The first {maximumShownFeatureInfos} are shown below.
                        </li>
                    </If>
                    <If condition={hiddenNumber > 1}>
                        <li className={Styles.messageItem}>
                            {totalFeaturesCount} {catalogItem.name} features were found. The first {maximumShownFeatureInfos} are shown below.
                        </li>
                    </If>
                    {featureInfoSections}
                </ul>
            </li>
        );
    }
});

module.exports = FeatureInfoCatalogItem;
