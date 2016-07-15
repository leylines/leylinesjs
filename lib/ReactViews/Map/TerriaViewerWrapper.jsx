import React from 'react';
import TerriaViewer from '../../ViewModels/TerriaViewer';
import Cartesian2 from 'terriajs-cesium/Source/Core/Cartesian2';
import Styles from './terria-viewer-wrapper.scss';

const TerriaViewerWrapper = React.createClass({
    // mixins: [ObserveModelMixin],

    propTypes: {
        terria: React.PropTypes.object.isRequired,
        viewState: React.PropTypes.object.isRequired
    },

    componentDidMount() {
        // Create the map/globe.
        this.terriaViewer = TerriaViewer.create(this.props.terria, {
            developerAttribution: {
                text: 'Data61',
                link: 'http://www.csiro.au/en/Research/D61'
            }
        });
    },

    shouldComponentUpdate() {
        return false;
    },

    componentWillUnmount() {
        this.terriaViewer && this.terriaViewer.destroy();
        this.mapElement.innerHTML = '';
    },

    lastMouseX: -1,
    lastMouseY: -1,

    onMouseMove(event) {
        // Avoid duplicate mousemove events.  Why would we get duplicate mousemove events?  I'm glad you asked:
        // http://stackoverflow.com/questions/17818493/mousemove-event-repeating-every-second/17819113
        // I (Kevin Ring) see this consistently on my laptop when Windows Media Player is running.
        if (event.clientX === this.lastMouseX && event.clientY === this.lastMouseY) {
            return;
        }

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;

        if (this.props.terria.cesium) {
            const rect = this.mapElement.getBoundingClientRect();
            const position = new Cartesian2(event.clientX - rect.left, event.clientY - rect.top);
            this.props.viewState.mouseCoords.updateCoordinatesFromCesium(this.props.terria, position);
        } else if (this.props.terria.leaflet) {
            this.props.viewState.mouseCoords.updateCoordinatesFromLeaflet(this.props.terria, event.nativeEvent);
        }
    },

    render() {
        return (
            <aside id="cesiumContainer"
                   className={Styles.cesiumContainer}
                   ref={element => {this.mapElement = element;}}
                   onMouseMove={this.onMouseMove}
             />
        );
    }
});
module.exports = TerriaViewerWrapper;
