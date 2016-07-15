import React from 'react';

import SearchHeader from '../Search/SearchHeader.jsx';
import SearchResult from '../Search/SearchResult.jsx';
import {addMarker} from '../Search/SearchMarkerUtils';
import ObserveModelMixin from '../ObserveModelMixin';

import Styles from './mobile-search.scss';

// A Location item when doing Bing map searvh or Gazetter search
const MobileSearch = React.createClass({
    mixins: [ObserveModelMixin],

    propTypes: {
        viewState: React.PropTypes.object,
        terria: React.PropTypes.object
    },

    onLocationClick(result) {
        result.clickAction();

        addMarker(this.props.terria, this.props.viewState, result);

        // Close modal window
        this.props.viewState.switchMobileView(null);
        this.props.viewState.searchState.showMobileLocationSearch = false;
    },

    render() {
        return (
            <div className={Styles.mobileSearch}>
                <div className={Styles.location}>
                    {this.renderLocationResult()}
                </div>
            </div>
        );
    },

    renderLocationResult() {
        const that = this;
        const searchState = this.props.viewState.searchState;
        return searchState.locationSearchProviders
            .filter(search => search.isSearching || (search.searchResults && search.searchResults.length))
            .map(search => (<div key={search.name}>
                <label className={Styles.label}>{search.name}</label>
                <SearchHeader searchProvider={search} />
                <ul className={Styles.results}>
                    { search.searchResults.map((result, i) => (
                        <SearchResult key={i} name={result.name} clickAction={that.onLocationClick.bind(that, result)} theme="light" />
                    ))}
                </ul>
            </div>));
    }
});

module.exports = MobileSearch;
