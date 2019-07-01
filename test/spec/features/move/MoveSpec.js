/* global sinon */

import {
  bootstrapDiagram,
  inject
} from 'test/TestHelper';

import {
  createCanvasEvent as canvasEvent
} from '../../../util/MockEvents';

import {
  assign,
  pick
} from 'min-dash';

import modelingModule from 'lib/features/modeling';
import moveModule from 'lib/features/move';

import rulesModule from './rules';

var spy = sinon.spy;


describe('features/move - Move', function() {

  beforeEach(bootstrapDiagram({ modules: [ moveModule, modelingModule, rulesModule ] }));

  beforeEach(inject(function(canvas, dragging) {
    dragging.setOptions({ manual: true });
  }));


  var rootShape, parentShape, childShape, childShape2, connection;

  beforeEach(inject(function(elementFactory, canvas) {

    rootShape = elementFactory.createRoot({
      id: 'root'
    });

    canvas.setRootElement(rootShape);

    parentShape = elementFactory.createShape({
      id: 'parent',
      x: 100, y: 100, width: 300, height: 300
    });

    canvas.addShape(parentShape, rootShape);

    childShape = elementFactory.createShape({
      id: 'child',
      x: 110, y: 110, width: 100, height: 100
    });

    canvas.addShape(childShape, parentShape);

    childShape2 = elementFactory.createShape({
      id: 'child2',
      x: 200, y: 110, width: 100, height: 100
    });

    canvas.addShape(childShape2, parentShape);

    connection = elementFactory.createConnection({
      id: 'connection',
      waypoints: [ { x: 150, y: 150 }, { x: 150, y: 200 }, { x: 350, y: 150 } ],
      source: childShape,
      target: childShape2
    });

    canvas.addConnection(connection, parentShape);
  }));


  describe('event centering', function() {

    it('should emit events relative to shape center', inject(function(eventBus, move, dragging) {

      // given
      function recordEvents(prefix) {
        var events = [];

        [ 'start', 'move', 'end', 'hover', 'out', 'cancel', 'cleanup', 'init' ].forEach(function(type) {
          eventBus.on(prefix + '.' + type, function(e) {
            events.push(assign({}, e));
          });
        });

        return events;
      }

      function position(e) {
        return pick(e, [ 'x', 'y', 'dx', 'dy' ]);
      }

      var events = recordEvents('shape.move');


      // when
      move.start(canvasEvent({ x: 0, y: 0 }), childShape);

      dragging.move(canvasEvent({ x: 20, y: 20 }));

      // then
      expect(events.map(position)).to.eql([
        { },
        { x: 160, y: 160, dx: 0, dy: 0 },
        { x: 180, y: 180, dx: 20, dy: 20 }
      ]);
    }));

  });


  describe('modeling', function() {

    it('should round movement to pixels', inject(function(move, dragging, elementRegistry) {

      // given
      move.start(canvasEvent({ x: 0, y: 0 }), childShape);

      // when
      dragging.move(canvasEvent({ x: 20, y: 20 }));
      dragging.hover({
        element: parentShape,
        gfx: elementRegistry.getGraphics(parentShape)
      });

      dragging.move(canvasEvent({ x: 30.4, y: 99.7 }));

      dragging.end();

      // then
      expect(childShape.x).to.eql(140);
      expect(childShape.y).to.eql(210);
    }));


    it('should accept context', inject(function(dragging, move) {

      // given
      var context = {
        foo: 'foo'
      };

      // when
      move.start(canvasEvent({ x: 0, y: 0 }), childShape, context);

      // then
      expect(dragging.context().data.context).to.include(context);
    }));


    it('should NOT move if no delta', inject(
      function(dragging, elementRegistry, modeling, move) {

        // given
        var moveElementsSpy = spy(modeling, 'moveElements');

        move.start(canvasEvent({ x: 0, y: 0 }), childShape);

        // when
        dragging.move(canvasEvent({ x: 20, y: 20 }));

        dragging.hover({
          element: parentShape,
          gfx: elementRegistry.getGraphics(parentShape)
        });

        dragging.move(canvasEvent({ x: 0, y: 0 }));

        dragging.end();

        // then
        expect(moveElementsSpy).not.to.have.been.called;

        expect(childShape.x).to.eql(110);
        expect(childShape.y).to.eql(110);
      }
    ));

  });


  describe.only('rules', function() {

    var immovableShape;

    beforeEach(inject(function(elementFactory, canvas) {

      immovableShape = elementFactory.createShape({
        id: 'immovable-disallow',
        x: 200, y: 250, width: 30, height: 30
      });

      canvas.addShape(immovableShape, parentShape);
    }));


    it('should not start move if rules disallow it', inject(function(eventBus, move) {
      // given
      var moveSpy = spy();

      eventBus.on('shape.move.init', moveSpy);

      // when
      move.start(canvasEvent({ x: 0, y: 0 }), immovableShape);

      // then
      expect(moveSpy).to.have.not.been.called;
    }));


    it('should disallow root shape movement per default', inject(function(eventBus, move) {
      // given
      var moveSpy = spy();

      eventBus.on('shape.move.init', moveSpy);

      // when
      move.start(canvasEvent({ x: 0, y: 0 }), rootShape);

      // then
      expect(moveSpy).to.have.not.been.called;
    }));


    it('should disallow connection movement per default', inject(function(eventBus, move) {
      // given
      var moveSpy = spy();

      eventBus.on('shape.move.init', moveSpy);

      // when
      move.start(canvasEvent({ x: 0, y: 0 }), connection);

      // then
      expect(moveSpy).to.have.not.been.called;
    }));

  });

});
