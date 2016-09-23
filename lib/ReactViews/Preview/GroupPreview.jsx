import React from 'react';

import DataPreviewSections from './DataPreviewSections';
import DataPreviewUrl from './DataPreviewUrl.jsx';
import ObserveModelMixin from '../ObserveModelMixin';
import Styles from './mappable-preview.scss';
import parseCustomMarkdownToReact from '../Custom/parseCustomMarkdownToReact';

/**
 * A "preview" for CatalogGroup.
 */
const GroupPreview = React.createClass({
    mixins: [ObserveModelMixin],

    propTypes: {
        previewed: React.PropTypes.object.isRequired,
        terria: React.PropTypes.object.isRequired,
        viewState: React.PropTypes.object.isRequired,
    },

    backToMap() {
        this.props.viewState.explorerPanelIsVisible = false;
    },

    render() {
        const metadataItem = this.props.previewed.nowViewingCatalogItem || this.props.previewed;

        return (
            <div>
                <h3>{this.props.previewed.name}</h3>
                <div className={Styles.previewedInfo}>
                    <div className={Styles.url}>
                        <Choose>
                            <When
                                condition={this.props.previewed.description && this.props.previewed.description.length > 0}>
                                <div>
                                    <h4 className={Styles.h4}>Description</h4>
                                    {parseCustomMarkdownToReact(this.props.previewed.description, {catalogItem: this.props.previewed})}
                                </div>
                            </When>
                        </Choose>

                        <DataPreviewSections metadataItem={metadataItem}/>

                        <If condition={metadataItem.dataCustodian}>
                            <div>
                                <h4 className={Styles.h4}>Data Custodian</h4>
                                {parseCustomMarkdownToReact(metadataItem.dataCustodian, {catalogItem: metadataItem})}
                            </div>
                        </If>

                        <If condition={metadataItem.url && metadataItem.url.length && !metadataItem.hideSource}>
                            <DataPreviewUrl metadataItem={metadataItem}/>
                        </If>
                    </div>
                </div>
            </div>
        );
    }
});

export default GroupPreview;

