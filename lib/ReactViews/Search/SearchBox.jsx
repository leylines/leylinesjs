import React from 'react';
import debounce from 'lodash.debounce';
import Icon from "../Icon.jsx";

import Styles from './search-box.scss';

const DEBOUNCE_INTERVAL = 2000;

/**
 * Simple dumb search box component that leaves the actual execution of searches to the component that renders it. Note
 * that just like an input, this calls onSearchTextChanged when the value is changed, and expects that its parent
 * component will listen for this and update searchText with the new value.
 */
export default React.createClass({
    displayName: 'SearchBox',
    propTypes: {
        /** Called when the search changes, after a debounce of {@link DEBOUNCE_INTERVAL} ms */
        onSearchTextChanged: React.PropTypes.func.isRequired,
        /** Called when an actual search is triggered, either by clicking the button or pressing Enter */
        onDoSearch: React.PropTypes.func.isRequired,
        /** The search text to display in the search box */
        searchText: React.PropTypes.string.isRequired,
        /** Called when the search box receives focus */
        onFocus: React.PropTypes.func,

        placeholder: React.PropTypes.string,
        onClear: React.PropTypes.func,
        alwaysShowClear: React.PropTypes.bool,
        autoFocus: React.PropTypes.bool
    },

    getDefaultProps() {
        return {
            placeholder: 'Search',
            alwaysShowClear: false,
            autoFocus: false
        };
    },

    componentWillMount() {
        this.searchWithDebounce = debounce(this.search, DEBOUNCE_INTERVAL);
    },

    componentWillUnmount() {
        this.removeDebounce();
    },

    hasValue() {
        return this.props.searchText.length > 0;
    },

    search() {
        this.removeDebounce();
        this.props.onDoSearch();
    },

    removeDebounce() {
        this.searchWithDebounce.cancel();
    },

    handleChange(event) {
        const value = event.target.value;
        this.props.onSearchTextChanged(value);
        this.searchWithDebounce();
    },

    clearSearch() {
        this.props.onSearchTextChanged('');
        this.search();

        if (this.props.onClear) {
            this.props.onClear();
        }
    },

    onKeyDown(event) {
        if (event.keyCode === 13) {
            this.search();
        }
    },

    render() {
        const clearButton = (
            <button type='button' className={Styles.searchClear} onClick={this.clearSearch}><Icon glyph={Icon.GLYPHS.close}/></button>
        );

        return (
            <form className={Styles.searchData} autoComplete='off' onSubmit={event => event.preventDefault()}>
                <label htmlFor='search' className={Styles.formLabel}>
                <Icon glyph={Icon.GLYPHS.search}/>
                </label>
                <input id='search'
                       type='text'
                       name='search'
                       value={this.props.searchText}
                       onChange={this.handleChange}
                       onFocus={this.props.onFocus}
                       onKeyDown={this.onKeyDown}
                       className={Styles.searchField}
                       placeholder={this.props.placeholder}
                       autoComplete='off'
                       autoFocus={this.props.autoFocus} />
                {(this.props.alwaysShowClear || this.hasValue()) && clearButton}
            </form>
        );
    }
});
