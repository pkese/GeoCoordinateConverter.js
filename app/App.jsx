"use strict";
var React = require('react');
var geo = require('./geo');
var Map = require('./Map');

require('./conv.scss');

let format = geo.formats;
let formats = Object.keys(format);
let source_formats = formats.filter( item => format[item].source > 0 );

// convert source point into all available formats
var dummy_convert = (source, fmt) => formats.reduce( (obj, f) => obj[f] = f==fmt ? source : [] , {});
var real_convert = (source, source_fmt) => {
  let conv = geo.convert[source_fmt];
  console.log('conv', source, source_fmt, '...', conv );
  let res = formats.reduce( (obj, fmt) => {
    if (fmt in  conv) obj[fmt] = conv[fmt](source);
    else if (fmt==source_fmt) obj[fmt] = source;
    else obj[fmt] = []
    return obj;
  } , {})
  console.log('conv', source, source_fmt, '->', res );
  // second pass -- fill in missing formats
  if (1) { // 
    for (let f in res) { // find missing results
      if (res[f].length != 0) continue;
      console.log('missing', f);
      for (let sk in res) { // find existing results
        if (res[sk].length != 0 && geo.convert[sk][f]) {
          res[f] = geo.convert[sk][f](res[sk]);
          break;
        }
      }
    }
  }
  return res;
}
var convert = dummy_convert;
geo.onLoad(() => {convert=real_convert});

var Conversions = React.createClass({
  render() {
    console.log('conversions1');
    loc = this.props.loc;
    console.log('conversions2');
    console.log('conversions', loc);
    let render_line = (fmt) => {
      let cloc = loc[fmt];
      let items = format[fmt].items;
      let fields = [];
      
      for (let i=0; i<cloc.length; i++) {
        fields.push(<th key={'h'+items[i]}>{items[i]}</th>); 
        fields.push(<td key={'d'+items[i]}>{cloc[i].toFixed(5)}</td>);
      };
      return (
        <tr key={fmt}>
          <th className='fmt'>{fmt}</th>
          { loc[fmt] ? {fields} : <td colspan={format[fmt].items.length*2}>-</td> }
        </tr>
      )
    }
    let formats = formats.map(render_line);
    console.log('formats:', format);
    return <table>{formats.map(render_line)}</table>
  }
});

var GeoConv = React.createClass({
  getInitialState() {
    let data = {
      //value: "154885.259 523494.788 -47.474",
      //fmt:'geoutm',
      value: "154885.259 523494.788 ",
      fmt:'gkxy',
      //fmt: 'fila_wgs',
      loaded: geo.loaded,
      marker: {lat:46.5375852874, lng:15.3015019823},
    };
    data.source = data.value.split(' ').filter(e => e.length>0).map(parseFloat);
    data.loc = {fmt: data.source};//convert(data.source, data.fmt)
    return data;
  },
  componentDidMount() {
    geo.onLoad(() => {
      let loc = convert(this.state.source, this.state.fmt);
      console.log('geo loaded, first conversion:', loc);
      this.setState({loaded: geo.loaded, loc:loc})
      this.onChange({value: this.state.value.trim()});
      //this.forceUpdate();
    });
  },
  onChange(args) {
    let value = args.value || this.state.value;
    let fmt = args.fmt || this.state.fmt;
    let marker = this.state.marker;
    if (this.state.value!=value || this.state.fmt != fmt) {
      let source = value.trim().replace(',','.').split(' ').filter(e => e.length>0).map(parseFloat);
      let loc = convert(source, fmt)
      // pick map marker position
      let mkloc = loc.fila_wgs.length > 0 ? loc.fila_wgs : loc.fila_ellips;
      if (mkloc && mkloc.length >= 2 && mkloc[1] > 0 && mkloc[1] < 40 && mkloc[0] > 0 && mkloc[0]<80) marker = {lat:mkloc[0], lng:mkloc[1]};
      this.setState({value, source, loc, fmt, marker});
      this.forceUpdate();
    }
  },
  inputChange(evt) {
    this.onChange({value:evt.target.value});
  },
  formatChange(evt) {
    if (!evt.target.checked) return;
    let value = this.state.value;
    console.log('fila_wgs?', evt.target.value, this.state.fmt);
    if (evt.target.value == 'fila_wgs') value = this.state.loc.fila_wgs.slice(0,2).join(' ');
    else if (this.state.fmt == 'fila_wgs') value = this.state.loc[evt.target.value].slice(0,2).join(' ');
    this.onChange({fmt:evt.target.value, value:value});
  },
  renderConversions() {
    if (!this.state.loaded) 
      return <span>Loading...</span>
    let loc = this.state.loc;  
    let render_line = (fmt) => {
      let cloc = loc[fmt];
      let items = format[fmt].items;
      let fields = [];
      
      for (let i=0; i<cloc.length; i++) {
        fields.push(<th key={'h'+items[i]}>{items[i]}</th>); 
        fields.push(<td key={'d'+items[i]}>{cloc[i].toFixed(5)}</td>);
      };
      return (
        <tr key={fmt}>
          <th className='fmt'>{format[fmt].name}</th>
          { loc[fmt] ? {fields} : <td colspan={format[fmt].items.length*2}>-</td> }
        </tr>
      )
    }
    return <table>{formats.map(render_line)}</table>
  },
  render(){
    console.log('render App', this.state.loc, this.state.marker);
    return (
      <div className='main'>
        <div className='form'>
          <div>Enter map location</div>
          <input type="text" placeholder="enter your coordinates" onChange={this.inputChange} value={this.state.value} />
          <div className="formats">
            <span>Source format:</span>
            {source_formats.map(fmt=>{return <input type="radio" name="fmt" value={fmt} key={fmt} checked={this.state.fmt==fmt ? "checked" : ""} onChange={this.formatChange}>{format[fmt].name}</input>})}
          </div>
        </div>
        <div className='conv'>
          <h2>Conversions</h2>
          {this.renderConversions()}
        </div>
        <Map {...this.state.marker} />
      </div>
    )
  }
});

var App = React.createClass({
  render() {
    return <GeoConv/>
  }
});

React.render(<App/>, document.getElementById('app'));
