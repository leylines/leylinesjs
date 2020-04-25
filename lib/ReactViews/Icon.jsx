import React from "react";
import PropTypes from "prop-types";
import createReactClass from "create-react-class";
import styled from "styled-components";
import classNames from "classnames";
import Styles from "./icon.scss";

// icon.jsx
const GLYPHS = {
  calendar: require("../../wwwroot/images/icons/calendar.svg"),
  about: require("../../wwwroot/images/icons/about.svg"),
  add: require("../../wwwroot/images/icons/add.svg"),
  arHover0: require("../../wwwroot/images/icons/ar-hover0.svg"),
  arHover1: require("../../wwwroot/images/icons/ar-hover1.svg"),
  arHover2: require("../../wwwroot/images/icons/ar-hover2.svg"),
  arOff: require("../../wwwroot/images/icons/ar-off.svg"),
  arOn: require("../../wwwroot/images/icons/ar-on.svg"),
  arRealign: require("../../wwwroot/images/icons/ar-realign.svg"),
  arResetAlignment: require("../../wwwroot/images/icons/ar-reset-alignment.svg"),
  backToStart: require("../../wwwroot/images/icons/back-to-start.svg"),
  backward: require("../../wwwroot/images/icons/backward.svg"),
  barChart: require("../../wwwroot/images/icons/bar-chart.svg"),
  bulb: require("../../wwwroot/images/icons/bulb.svg"),
  controls: require("../../wwwroot/images/icons/controls.svg"),
  checkboxOff: require("../../wwwroot/images/icons/checkbox-off.svg"),
  checkboxOn: require("../../wwwroot/images/icons/checkbox-on.svg"),
  close: require("../../wwwroot/images/icons/close.svg"),
  closeLight: require("../../wwwroot/images/icons/close-light.svg"),
  closed: require("../../wwwroot/images/icons/closed.svg"),
  decrease: require("../../wwwroot/images/icons/decrease.svg"),
  download: require("../../wwwroot/images/icons/download.svg"),
  downloadNew: require("../../wwwroot/images/icons/download-new.svg"),
  expand: require("../../wwwroot/images/icons/expand.svg"),
  eye: require("../../wwwroot/images/icons/eye.svg"),
  externalLink: require("../../wwwroot/images/icons/external-link.svg"),
  feedback: require("../../wwwroot/images/icons/feedback.svg"),
  folder: require("../../wwwroot/images/icons/folder.svg"),
  folderOpen: require("../../wwwroot/images/icons/folder-open.svg"),
  forward: require("../../wwwroot/images/icons/forward.svg"),
  geolocation: require("../../wwwroot/images/icons/geolocation.svg"),
  gallery: require("../../wwwroot/images/icons/gallery.svg"),
  help: require("../../wwwroot/images/icons/help.svg"),
  helpThick: require("../../wwwroot/images/icons/help-thick.svg"),
  increase: require("../../wwwroot/images/icons/increase.svg"),
  left: require("../../wwwroot/images/icons/left.svg"),
  lineChart: require("../../wwwroot/images/icons/line-chart.svg"),
  link: require("../../wwwroot/images/icons/link.svg"),
  loader: require("../../wwwroot/images/icons/loader.svg"),
  location: require("../../wwwroot/images/icons/location.svg"),
  location2: require("../../wwwroot/images/icons/location2.svg"),
  lock: require("../../wwwroot/images/icons/lock.svg"),
  loop: require("../../wwwroot/images/icons/loop.svg"),
  menu: require("../../wwwroot/images/icons/menu.svg"),
  measure: require("../../wwwroot/images/icons/measure.svg"),
  opened: require("../../wwwroot/images/icons/opened.svg"),
  pause: require("../../wwwroot/images/icons/pause.svg"),
  play: require("../../wwwroot/images/icons/play.svg"),
  radioOff: require("../../wwwroot/images/icons/radio-off.svg"),
  radioOn: require("../../wwwroot/images/icons/radio-on.svg"),
  refresh: require("../../wwwroot/images/icons/refresh.svg"),
  remove: require("../../wwwroot/images/icons/remove.svg"),
  right: require("../../wwwroot/images/icons/right.svg"),
  right2: require("../../wwwroot/images/icons/right2.svg"),
  search: require("../../wwwroot/images/icons/search.svg"),
  selected: require("../../wwwroot/images/icons/selected.svg"),
  settings: require("../../wwwroot/images/icons/settings.svg"),
  share: require("../../wwwroot/images/icons/share.svg"),
  showLess: require("../../wwwroot/images/icons/show-less.svg"),
  showMore: require("../../wwwroot/images/icons/show-more.svg"),
  sphere: require("../../wwwroot/images/icons/sphere.svg"),
  map: require("../../wwwroot/images/icons/map.svg"),
  splitter: require("../../wwwroot/images/icons/splitter.svg"),
  splitterOn: require("../../wwwroot/images/icons/splitterOn.svg"),
  splitterOff: require("../../wwwroot/images/icons/splitterOff.svg"),
  diffImage: require("../../wwwroot/images/icons/splitter.svg"),
  previous: require("../../wwwroot/images/icons/previous.svg"),
  next: require("../../wwwroot/images/icons/next.svg"),
  timeline: require("../../wwwroot/images/icons/timeline.svg"),
  data: require("../../wwwroot/images/icons/data.svg"),
  dataCatalog: require("../../wwwroot/images/icons/dataCatalog.svg"),
  upload: require("../../wwwroot/images/icons/upload.svg"),
  trashcan: require("../../wwwroot/images/icons/trashcan.svg"),
  local: require("../../wwwroot/images/icons/localfile.svg"),
  web: require("../../wwwroot/images/icons/remotefile.svg"),
  compassInner: require("../../wwwroot/images/icons/compass-inner.svg"),
  compassInnerArrows: require("../../wwwroot/images/icons/compass-inner-arrows.svg"),
  compassOuter: require("../../wwwroot/images/icons/compass-outer.svg"),
  compassOuterSkeleton: require("../../wwwroot/images/icons/compass-outer-skeleton.svg"),
  compassOuterEnlarged: require("../../wwwroot/images/icons/compass-outer-enlarged.svg"),
  compassRotationMarker: require("../../wwwroot/images/icons/compass-rotation-marker.svg"),
  circleFull: require("../../wwwroot/images/icons/circlef-full.svg"),
  circleEmpty: require("../../wwwroot/images/icons/circle-empty.svg"),
  story: require("../../wwwroot/images/icons/story.svg"),
  recapture: require("../../wwwroot/images/icons/recapture.svg"),
  menuDotted: require("../../wwwroot/images/icons/menu-dotted.svg"),
  cancel: require("../../wwwroot/images/icons/cancel.svg"),
  user: require("../../wwwroot/images/icons/user.svg"),
  datePicker: require("../../wwwroot/images/icons/date-picker-icon.svg"),
  tour: require("../../wwwroot/images/icons/take-the-tour-icon.svg"),
  layers: require("../../wwwroot/images/icons/pulling-away-layers-icon.svg"),
  start: require("../../wwwroot/images/icons/getting-started-icon.svg"),
  cube: require("../../wwwroot/images/icons/interact.svg")
};

export const Icon = createReactClass({
  propTypes: {
    glyph: PropTypes.object,
    style: PropTypes.object,
    className: PropTypes.string
  },
  render() {
    const glyph = this.props.glyph;
    return (
      <svg
        viewBox="0 0 100 100"
        className={classNames("icon", this.props.className, Styles.svg)}
        style={this.props.style}
      >
        <use xlinkHref={"#" + glyph.id} />
      </svg>
    );
  }
});

export const StyledIcon = styled(Icon)`
  flex-shrink: 0;
  ${props => props.styledWidth && `width: ${props.styledWidth};`}

  ${props => props.light && `fill: ${props.theme.textLight};`}
  ${props => props.dark && `fill: ${props.theme.textDark};`}

  ${props => props.fillColor && `fill: ${props.fillColor};`}

  ${props => props.opacity && `opacity: ${props.opacity};`}
`;

export default Icon;
// (?) are these cjs exports for the doc generator?
module.exports = Icon;
module.exports.GLYPHS = GLYPHS;
module.exports.StyledIcon = StyledIcon;
