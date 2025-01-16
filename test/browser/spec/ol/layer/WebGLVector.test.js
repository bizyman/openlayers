import {spy as sinonSpy} from 'sinon';
import Map from '../../../../../src/ol/Map.js';
import View from '../../../../../src/ol/View.js';
import WebGLVectorLayer from '../../../../../src/ol/layer/WebGLVector.js';
import {getRenderPixel} from '../../../../../src/ol/render.js';
import WebGLVectorLayerRenderer from '../../../../../src/ol/renderer/webgl/VectorLayer.js';
import VectorSource from '../../../../../src/ol/source/Vector.js';

describe('ol/layer/WebGLVector', function () {
  /** @type {WebGLVectorLayer} */
  let layer;
  /** @type {Map} */
  let map, target;

  beforeEach(function (done) {
    layer = new WebGLVectorLayer({
      className: 'testlayer',
      source: new VectorSource(),
      style: [
        {
          'circle-radius': 4,
          'circle-fill-color': ['var', 'fillColor'],
        },
        {
          'fill-color': ['var', 'fillColor'],
        },
      ],
      variables: {
        fillColor: 'rgba(255, 0, 0, 0.5)',
      },
      disableHitDetection: false,
    });
    target = document.createElement('div');
    target.style.width = '100px';
    target.style.height = '100px';
    document.body.appendChild(target);
    map = new Map({
      target: target,
      layers: [layer],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
    });
    map.once('rendercomplete', () => done());
  });

  afterEach(function () {
    disposeMap(map);
    map.getLayers().forEach((layer) => layer.dispose());
  });

  describe('dispose()', () => {
    it('calls dispose on the renderer', () => {
      const renderer = layer.getRenderer();
      const spy = sinonSpy(renderer, 'dispose');
      layer.dispose();
      expect(spy.called).to.be(true);
    });
  });

  it('creates a renderer with the given parameters', function () {
    const renderer = layer.getRenderer();
    expect(renderer).to.be.a(WebGLVectorLayerRenderer);
    expect(renderer.styles_).to.eql([
      {
        style: {
          'circle-radius': 4,
          'circle-fill-color': ['var', 'fillColor'],
        },
      },
      {
        style: {
          'fill-color': ['var', 'fillColor'],
        },
      },
    ]);
    expect(renderer.styleVariables_).to.eql({
      fillColor: 'rgba(255, 0, 0, 0.5)',
    });
    expect(renderer.hitDetectionEnabled_).to.be(true);
  });

  describe('updateStyleVariables()', function () {
    it('updates style variables', function () {
      layer.updateStyleVariables({
        fillColor: 'yellow',
      });
      expect(layer.styleVariables_['fillColor']).to.be('yellow');
      const renderer = layer.getRenderer();
      const uniforms = renderer.styleRenderers_[0].uniforms_;
      expect(uniforms.u_var_fillColor()).to.eql([255, 255, 0, 1]);
    });

    it('can be called before the layer is rendered', function () {
      layer = new WebGLVectorLayer({
        style: {
          'fill-color': ['var', 'fillColor'],
        },
        source: new VectorSource(),
      });

      layer.updateStyleVariables({foo: 'bam'});
      expect(layer.styleVariables_.foo).to.be('bam');
    });

    it('can be called even if no initial variables are provided', function () {
      const layer = new WebGLVectorLayer({
        source: new VectorSource(),
      });

      layer.updateStyleVariables({foo: 'bam'});
      expect(layer.styleVariables_.foo).to.be('bam');
    });
  });

  it('dispatches a precompose event with WebGL context', (done) => {
    let called = false;
    layer.on('precompose', (event) => {
      expect(event.context).to.be.a(WebGLRenderingContext);
      called = true;
    });

    map.once('rendercomplete', () => {
      expect(called).to.be(true);
      done();
    });

    map.render();
  });

  it('dispatches a prerender event with WebGL context and inverse pixel transform', (done) => {
    let called = false;
    layer.on('prerender', (event) => {
      expect(event.context).to.be.a(WebGLRenderingContext);
      const mapSize = event.frameState.size;
      const bottomLeft = getRenderPixel(event, [0, mapSize[1]]);
      expect(bottomLeft).to.eql([0, 0]);
      called = true;
    });

    map.once('rendercomplete', () => {
      expect(called).to.be(true);
      done();
    });

    map.render();
  });

  it('dispatches a postrender event with WebGL context and inverse pixel transform', (done) => {
    let called = false;
    layer.on('postrender', (event) => {
      expect(event.context).to.be.a(WebGLRenderingContext);
      const mapSize = event.frameState.size;
      const topRight = getRenderPixel(event, [mapSize[1], 0]);
      const pixelRatio = event.frameState.pixelRatio;
      expect(topRight).to.eql([
        mapSize[0] * pixelRatio,
        mapSize[1] * pixelRatio,
      ]);
      called = true;
    });

    map.once('rendercomplete', () => {
      expect(called).to.be(true);
      done();
    });

    map.render();
  });

  it('works if the layer is constructed without a source', (done) => {
    const sourceless = new WebGLVectorLayer({
      className: 'testlayer',
      style: {
        'fill-color': 'red',
      },
    });

    map.addLayer(sourceless);

    sourceless.setSource(new VectorSource());

    let called = false;
    layer.on('postrender', (event) => {
      called = true;
    });

    map.once('rendercomplete', () => {
      expect(called).to.be(true);
      done();
    });
  });
});
