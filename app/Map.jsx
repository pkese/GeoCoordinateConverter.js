
var React = require('react');
var Promise = require('es6-promise').Promise;
var promisescript = require('promisescript');

var API_KEY = '' // enter your Google maps api key

var mapPromise = new Promise( (resolve, reject) => {
  window.initialize_map = resolve;
  promisescript({
    url: '//maps.googleapis.com/maps/api/js?v=3.exp&callback=initialize_map', // ?API_KEY...
    type: 'script',
    exposed: 'google',
  }).then( () => {});
});



var Map = React.createClass({
  map: null,
  markers: [],
  getInitialState() {
    return {
      center: {lat: this.props.lat, lng: this.props.lng},
      zoom: 11,
    }
  },
  componentDidMount() {
    mapPromise.then( () => {
      console.log('maploader succeeded');
      this.map = new google.maps.Map(document.getElementById('map'), this.state);
      this.markers.push(new google.maps.Marker({map:this.map}));
    });
  },
  render() {
    if (this.map) {
      console.log('marker position:',this.props.lat,this.props.lng);
      let position = new google.maps.LatLng(this.props.lat,this.props.lng);
      let marker = this.markers[0];
      marker.setPosition(position);
      this.map.setCenter(position);
    };
    return <div id="map_wrapper"><div id='map' /></div>
  }
});


module.exports = Map;

