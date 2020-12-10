import React from "react";
import classNames from "classnames";
import Icon from "../Icon.jsx";
import PropTypes from "prop-types";
import Styles from "./menu-button.scss";

/**
 * Basic button for use in the menu part at the top of the map.
 *
 * @constructor
 */
function MenuButton(props) {
  return (
    <a
      className={classNames(Styles.btnAboutLink, {
        [Styles.aboutTweak]: props.href === "about.html"
      })}
      href={props.href}
      target={props.href !== "#" ? "_blank" : undefined}
      title={props.caption}
    >
      {props.href !== "#" && <Icon glyph={Icon.GLYPHS.externalLink} />}
      <span>{props.caption}</span>
    </a>
  );
}

MenuButton.defaultProps = {
  href: "#"
};

MenuButton.propTypes = {
  href: PropTypes.string,
  caption: PropTypes.string.isRequired
};

export default MenuButton;
