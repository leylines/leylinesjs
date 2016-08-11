import ObserveModelMixin from '../ObserveModelMixin';
import React from 'react';
import SearchResult from './SearchResult.jsx';
import BadgeBar from '../BadgeBar.jsx';
import Styles from './sidebar-search.scss';
import LocationSearchResults from './LocationSearchResults.jsx';

import {addMarker} from './SearchMarkerUtils';

// Handle any of the three kinds of search based on the props
const SidebarSearch = React.createClass({
    mixins: [ObserveModelMixin],

    propTypes: {
        viewState: React.PropTypes.object.isRequired,
        isWaitingForSearchToStart: React.PropTypes.bool,
        terria: React.PropTypes.object.isRequired
    },

    searchInDataCatalog() {
        this.props.viewState.searchInCatalog(this.props.viewState.searchState.locationSearchText);
    },

    backToNowViewing() {
        this.props.viewState.searchState.showLocationSearchResults = false;
    },

    onLocationClick(result) {
        addMarker(this.props.terria, this.props.viewState, result);
        result.clickAction();
    },

    render() {
        const searchResultCount = this.props.viewState.searchState.locationSearchProviders.reduce((count, result) => count + result.searchResults.length, 0);
        return (
            <div className={Styles.search}>
                <div className={Styles.results}>
                    <BadgeBar label="Search Results" badge={searchResultCount}>
                        <button type='button' onClick={this.backToNowViewing}
                                className={Styles.btnDone}>Done
                        </button>
                    </BadgeBar>
                    <div className={Styles.resultsContent}>
                        <For each="search" of={this.props.viewState.searchState.locationSearchProviders}>
                            <LocationSearchResults key={search.name}
                                                   terria={this.props.terria}
                                                   viewState={this.props.viewState}
                                                   search={search}
                                                   onLocationClick={this.onLocationClick}
                                                   isWaitingForSearchToStart={this.props.isWaitingForSearchToStart}

                            />
                        </For>
                        <If condition={this.props.viewState.searchState.locationSearchText.length > 0}>
                            <div className={Styles.providerResult}>
                                <h4 className={Styles.heading}>Data Catalog</h4>
                                <ul className={Styles.btnList}>
                                    <SearchResult clickAction={this.searchInDataCatalog}
                                                  showPin={false}
                                                  name={`Search ${this.props.viewState.searchState.locationSearchText} in the Data Catalog`}
                                    />
                                </ul>
                            </div>
                        </If>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = SidebarSearch;

