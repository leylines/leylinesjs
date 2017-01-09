'use strict';

import classNames from 'classnames';
import Concept from '../Concept';
import Icon from '../../../Icon.jsx';
import ObserveModelMixin from '../../../ObserveModelMixin';
import React from 'react';
import Styles from './summary-concept.scss';

const NEW_TEXT = 'New condition';

const OpenInactiveConcept = React.createClass({
    mixins: [ObserveModelMixin],

    propTypes: {
        rootConcept: React.PropTypes.object.isRequired,
        openInactiveConcept: React.PropTypes.object.isRequired
    },

    cancel() {
        this.props.openInactiveConcept.isOpen = false;
    },

    back() {
        this.props.openInactiveConcept.isOpen = false;
        this.props.openInactiveConcept.parent.isOpen = true;
    },

    render() {
        const showControls = this.props.rootConcept.allowMultiple;
        return (
            <div className={Styles.section}>
                <div className={Styles.controls}>
                    <If condition={showControls}>
                        <button className={Styles.btnClose} onClick={this.cancel}>
                            Cancel
                        </button>
                    </If>
                </div>
                <div className={Styles.heading}>
                    <If condition={this.props.rootConcept !== this.props.openInactiveConcept}>
                        <If condition={showControls}>
                            <button className={Styles.btnBack} onClick={this.back}>
                                <Icon glyph={Icon.GLYPHS.left}/>
                            </button>
                        </If>
                        <div className={classNames({[Styles.indented]: showControls})}>
                            {this.props.openInactiveConcept.name}
                        </div>
                    </If>
                    <If condition={this.props.rootConcept === this.props.openInactiveConcept}>
                        {NEW_TEXT}
                    </If>
                </div>
                <ul className={Styles.childrenList}>
                    <For each="child" index="i" of={this.props.openInactiveConcept.items}>
                        <If condition={child.items && child.items.length > 0}>
                            <ConceptParent concept={child} key={i}/>
                        </If>
                        <If condition={!child.items || child.items.length === 0}>
                            <li className={Styles.items}>
                                <ul className={Styles.listReset}>
                                    <Concept concept={child} key={i}/>
                                </ul>
                            </li>
                        </If>
                    </For>
                </ul>
            </div>
        );
    }
});

const ConceptParent = React.createClass({
    mixins: [ObserveModelMixin],

    propTypes: {
        concept: React.PropTypes.object.isRequired
    },

    open() {
        this.props.concept.isOpen = true;
        this.props.concept.parent.isOpen = false;
    },

    render() {
        return (
            <li>
                <div className={Styles.btnAddOpen} onClick={this.open}>
                    <div className={Styles.controls}>
                        <Icon glyph={Icon.GLYPHS.closed}/>
                    </div>
                    <div className={Styles.condition}>
                        {this.props.concept.name}
                    </div>
                </div>
            </li>
        );
    }
});

module.exports = OpenInactiveConcept;
