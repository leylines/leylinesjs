import React from 'react';
import defined from 'terriajs-cesium/Source/Core/defined';
import ObserveModelMixin from '../ObserveModelMixin';

import Styles from './parameter-editors.scss';

const RegionTypeParameterEditor = React.createClass({
    mixins: [ObserveModelMixin],
    propTypes: {
        previewed: React.PropTypes.object,
        parameter: React.PropTypes.object,
        parameterValues: React.PropTypes.object
    },

    getInitialState() {
        return {
            regionProviders: []
        };
    },

    componentWillMount() {
        this.getAllOptions();
    },

    onChange(e) {
        this.props.parameterValues[this.props.parameter.id] = this.state.regionProviders.filter(r=> r.regionType === e.target.value)[0];
    },

    getDefaultValue() {
        const nowViewingItems = this.props.previewed.terria.nowViewing.items;
        if(nowViewingItems.length > 0) {
            for (let i = 0; i < nowViewingItems.length; ++i) {
                const item = nowViewingItems[i];
                if (defined(item.regionMapping) && defined(item.regionMapping.regionDetails) && item.regionMapping.regionDetails.length > 0) {
                    return item.regionMapping.regionDetails[0].regionProvider;
                }
            }
        }
        if(this.state.regionProviders.length) {
            return this.state.regionProviders[0];
        }
    },

    getAllOptions() {
        const that = this;
        this.props.parameter.getAllRegionTypes().then(function(_regionProviders) {
            that.setState({
                regionProviders: _regionProviders
            });
        });
    },

    render() {
        if(!defined(this.props.parameterValues[this.props.parameter.id])) {
            this.props.parameterValues[this.props.parameter.id] = this.getDefaultValue();
        }
        return <select className={Styles.field}
                       onChange={this.onChange}
                       value={this.props.parameterValues[this.props.parameter.id] ? this.props.parameterValues[this.props.parameter.id].regionType : ''}>
                       {this.state.regionProviders.map((r, i)=>
                        (<option value={r.regionType}
                                 key={i}
                         >{r.regionType}</option>))}
                </select>;
    }
});

module.exports = RegionTypeParameterEditor;
