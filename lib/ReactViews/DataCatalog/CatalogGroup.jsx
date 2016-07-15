import React from 'react';
import classNames from 'classnames';

import Loader from '../Loader.jsx';
import Icon from "../Icon.jsx";

import Styles from './data-catalog-group.scss';

/**
 * Dumb component that encapsulated the display logic for a catalog group.
 *
 * @constructor
 */
function CatalogGroup(props) {
    return (
        <li className={Styles.root}>
            <button type='button'
                    className={classNames(
                            Styles.btnCatalog,
                            {[Styles.btnCatalogTopLevel]: props.topLevel},
                            {[Styles.btnIsOpen]: props.open}
                        )}
                    onClick={props.onClick}>
                <If condition={!props.topLevel}>
                 <span className={Styles.folder}>{props.open ? <Icon glyph={Icon.GLYPHS.folderOpen}/> : <Icon glyph={Icon.GLYPHS.folder}/>}</span>
                </If>
                {props.text}
                <span className={Styles.caret}>{props.open ? <Icon glyph={Icon.GLYPHS.opened}/> : <Icon glyph={Icon.GLYPHS.closed}/>}</span>
            </button>
            <If condition={props.open}>
                <ul className={classNames(
                        Styles.catalogGroup,
                        {[Styles.catalogGroupLowerLevel]: !props.topLevel}
                    )}>
                    <Choose>
                        <When condition={props.loading}>
                            <li key="loader">
                                <Loader />
                            </li>
                        </When>
                        <When condition={props.children.length === 0 && props.emptyMessage}>
                            <li className={classNames(Styles.label, Styles.labelNoResults)} key="empty">
                                {props.emptyMessage}
                            </li>
                        </When>
                    </Choose>
                    {props.children}
                </ul>
            </If>
        </li>
    );
}

CatalogGroup.propTypes = {
    text: React.PropTypes.string,
    topLevel: React.PropTypes.bool,
    open: React.PropTypes.bool,
    loading: React.PropTypes.bool,
    emptyMessage: React.PropTypes.string,
    onClick: React.PropTypes.func,
    children: React.PropTypes.oneOfType([
        React.PropTypes.element,
        React.PropTypes.arrayOf(React.PropTypes.element)
    ])
};

export default CatalogGroup;
