/*SelectToolModel.js
 *base model class for all direct manipulation tool models*/

define([
  'underscore',
  'paper',
  'backbone',
  'models/tools/BaseToolModel',
  'utils/PPoint'



], function(_, paper, Backbone, BaseToolModel, PPoint) {
  var segments = [];
  var literal;
  var handle;
  var segmentMod = false;
  var copyReset = true;
  //keeps track of when a copy was released to set correct position data for the new instance
  var copyInitialized = false;
  var startPoint, startDist, startWidth, startHeight = null;
  var dHitOptions = {
    segments: true,
    curves: true,
    handles: true,
    fill: true,
    tolerance: 5,

  };

  var hitOptions = {
    stroke: true,
    fill: true,
    bounds: true,
    center: true,
    tolerance: 2
  };

  var SelectToolModel = BaseToolModel.extend({
    defaults: _.extend({}, BaseToolModel.prototype.defaults, {
      selected_shapes: null,
      selections: null,
      current_sel_index: 0,
      mode: 'select'
    }),

    initialize: function() {
      BaseToolModel.prototype.initialize.apply(this, arguments);
      this.set('selected_shapes', []);
      this.set('selections', []);
      //this.on('change:mode', this.convertSelection);
    },

    convertSelection: function() {
      var selected_shapes = this.get('selected_shapes');
      if (selected_shapes.length > 0) {
        var toAdd = [];
        var toRemove = [];
        var mode = this.get('mode');
        if (mode === 'dselect') {
          for (var j = 0; j < selected_shapes.length; j++) {
            if (selected_shapes[j].get('points')) {
              toRemove.push(selected_shapes[j]);
              var points = selected_shapes[j].get('points');
              for (var k = 0; k < points.length; k++) {
                var point = points[k];
                if (!_.contains(toAdd, point)) {
                  toAdd.push(point);
                }
              }
            }
          }

        } else {
          for (var i = 0; i < selected_shapes.length; i++) {
            if (selected_shapes[i].get('name') === 'point') {
              toRemove.push(selected_shapes[i]);
              var parent = selected_shapes[i].nodeParent;
              if (!_.contains(toAdd, parent)) {
                toAdd.push(parent);
              }
            }
          }
        }
        this.removeSelectedShape(toRemove);
        this.addSelectedShape(toAdd);
      }

    },

    deselectAll: function() {
      // TODO: do this across all selections

      var selected_shapes = this.get('selected_shapes');
      for (var i = selected_shapes.length - 1; i >= 0; i--) {
       selected_shapes[i].set('selected', false);
        selected_shapes[i].setSelectionForInheritors(false);
      }
      selected_shapes.length = 0;
    },

    addSelectedShape: function(data) {
      if (data instanceof Array) {
        for (var i = 0; i < data.length; i++) {
          this.addSingleShape(data[i]);
        }
      } else {
        this.addSingleShape(data);
      }
    },

    addSingleShape: function(instance) {
      var selected_shapes = this.get('selected_shapes');
      if (!_.contains(selected_shapes, instance)) {
        instance.set('selected', true);
        instance.setSelectionForInheritors(true, this.get('tool-mode'), this.get('tool-modifier'), 1);
        instance.set('sel_palette_index', this.get('current_sel_index'));
        selected_shapes.push(instance);
      }
    },

    removeSelectedShape: function(data) {
      if (data instanceof Array) {
        console.log('num of shapes to remove', data.length, data);
        for (var i = 0; i < data.length; i++) {
          console.log('attempting to remove shape at', i);
          var shape = data[i];
          shape.set('selected', false);
          shape.setSelectionForInheritors(false);
        }
        var selected_shapes = this.get('selected_shapes');
        var newShapes = selected_shapes.filter(function(item) {
          return !_.contains(data, item);
        });
        this.set('selected_shapes', newShapes);
      } else {
        this.removeSingleShape(data);
      }
    },

    removeSingleShape: function(shape) {
      shape.set('selected', false);
      shape.setSelectionForInheritors(false);
      var selected_shapes = this.get('selected_shapes');
      if (_.contains(selected_shapes, shape)) {
        var index = _.indexOf(selected_shapes, shape);
        console.log('removing shape', shape, index);
        selected_shapes.splice(index, 1);
      }
    },

    // EXPERIMENTAL
    saveSelection: function() {
      var selections = this.get('selections');
      selections.push(this.get('selected_shapes'));
      this.set('selected_shapes', []);
      this.set('selections', selections);
      var current_sel_index = this.get('current_sel_index');
      current_sel_index += 1;
      this.set('current_sel_index', current_sel_index);
    },

    changeModeForSelection: function(mode, modifier) {
      var selectedShapes = this.get('selected_shapes');
      for (var i = 0; i < selectedShapes.length; i++) {
        selectedShapes[i].setSelectionForInheritors(true, mode, modifier, 1);
      }
    },

    resetSelections: function() {
      this.deselectAll();
      var selections = this.get('selections');
      for (var i = 0; i < selections.length; i++) {
        this.set('selected_shapes', selections[i]);
        this.deselectAll();
      }
      this.set('selections', []);
      this.set('current_sel_index', 0);
    },

    getCurrentSelection: function() {
      var selections = this.get('selected_shapes');
      return selections;
    },
    // END EXPERIMENTAL


    getLastSelected: function() {
      var selected_shapes = this.get('selected_shapes');
      if (selected_shapes.length > 0) {
        return selected_shapes[selected_shapes.length - 1];
      }
      return null;
    },

    modifyGeometry: function(data, modifiers) {
      var selectedShapes = this.get('selected_shapes');
      if (selectedShapes.length > 0) {
        for (var i = 0; i < selectedShapes.length; i++) {
          var instance = selectedShapes[i];
          instance.modifyProperty(data, this.get('tool-mode'), this.get('tool-modifier'));
        }
        this.trigger('geometryModified');
      }
    },


    modifySegment: function(data, handle, modifiers) {
      var selectedShapes = this.get('selected_shapes');
      for (var i = 0; i < selectedShapes.length; i++) {
        var instance = selectedShapes[i];
        instance.nodeParent.modifyPoints(data, this.get('tool-mode'), this.get('tool-modifier'));
      }
      this.trigger('geometryModified');
    },


    /*mousedown event
     */
    mouseDown: function(event) {
      switch (this.get('mode')) {
        case 'select':
          this.selectDown(event);
          break;
        case 'dselect':
          this.dSelectDown(event);
          break;
        case 'rotate':
        case 'scale':
          this.rotateDown(event);
          startDist = event.point.subtract(literal.position);

          startWidth = literal.bounds.width;
          startHeight = literal.bounds.height;

          break;
      }
    },

    rotateDown: function(event) {
      if (event.modifiers.option) {
        this.selectDown(event, true);
      } else {
        this.selectDown(event);
      }
    },


    selectDown: function(event, noDeselect) {
      //automaticall deselect all on mousedown if shift modifier is not enabled
      var instance = null;
      var modifier = null;
      if (!event.modifiers.shift) {
        if (!noDeselect) {
          this.deselectAll();
        }
      }
      var hitResult = paper.project.hitTest(event.point, hitOptions);

      // make sure that a true instance is selected
      if (hitResult && hitResult.item.data.instance) {

        var path = hitResult.item;

        literal = path;
        instance = literal.data.instance;


        modifier = event.modifiers.command;

        this.addSelectedShape(instance);
      }

      this.trigger('geometrySelected', instance, null, modifier);


    },


    dSelectDown: function(event, noDeselect) {
      //automaticall deselect all on mousedown if shift modifier is not enabled
      if (!event.modifiers.shift) {
        if (!noDeselect) {
          this.deselectAll();
        }
      }

      var hitResult = paper.project.hitTest(event.point, dHitOptions);
      var instance, points;
      if (hitResult) {
        var path = hitResult.item;
        instance = path.data.instance;
        if (hitResult.type == 'segment') {
          hitResult.segment.fullySelected = true;
          segments.push({
            index: hitResult.segment.index,
            type: hitResult.type
          });
        } else if (hitResult.type == 'handle-in' || hitResult.type == 'handle-out') {
          handle = hitResult.type;
          segments.push({
            index: hitResult.segment.index,
            type: hitResult.type
          });
        } else if (hitResult.type == 'curve') {
          segments.push({
            index: hitResult.location._segment1.index,
            type: hitResult.type
          });
          segments.push({
            index: hitResult.location._segment2.index,
            type: hitResult.type
          });
        } else if (hitResult.type == 'fill') {
          for (var i = 0; i < path.segments.length; i++) {
            segments.push({
              index: path.segments[i].index,
              type: 'segment'
            });
          }
        }
        if (!instance.get('proto_node')) {
          points = instance.setSelectedSegments(segments);
          this.addSelectedShape(points);
        }
      }
      this.trigger('geometrySelected', instance, points);


    },



    //mouse drag event
    mouseDrag: function(event) {
      var selectedShapes = this.get('selected_shapes');
      if (selectedShapes.length > 0) {
        switch (this.get('mode')) {
          case 'select':
            this.selectDrag(event);
            break;
          case 'dselect':
            this.dSelectDrag(event);
            break;
          case 'rotate':
            this.rotateDrag(event);
            break;
          case 'scale':
            this.scaleDrag(event);
            break;
        }
      }
    },

    selectDrag: function(event) {
      if (event.modifiers.option && copyReset) {
        copyReset = false;
        copyInitialized = true;
        var currentShape = this.getLastSelected();
        var instance = currentShape.create();
        this.removeSelectedShape(currentShape);
        this.addSelectedShape(instance);
        this.trigger('addInstance', instance);
      }

      var data = {};
      data.translation_delta = {
        operator: 'add',
        x: event.delta.x,
        y: event.delta.y
      };
      this.modifyGeometry(data, event.modifiers);


    },

    dSelectDrag: function(event) {
      var data = {};
      data.translation_delta = {
        operator: 'add',
        x: event.delta.x,
        y: event.delta.y
      };
      this.modifySegment(data, handle, event.modifiers);

    },

    rotateDrag: function(event) {
      var posPoint = this.getRelativePoint();
      if (posPoint) {
        var angle = event.lastPoint.subtract(posPoint).angle;
        var dAngle = event.point.subtract(posPoint).angle;
        var data = {};
        data.rotation_delta = {
          val: dAngle - angle,
          operator: 'add'
        };
        this.modifyGeometry(data, event.modifiers);

      }

    },

    scaleDrag: function(event) {
      var selectedShapes = this.get('selected_shapes');
      var scaleDelta = selectedShapes[0].accessProperty('scaling_delta');
      var posPoint = this.getRelativePoint();
      if (posPoint) {

        var clickPos = startDist; //position of clicked point, relative to center
        var dragPos = event.point.subtract(posPoint); //position of the point dragged to (relative to center)
        var draggedVect = dragPos; //vector of dragged pt movement
        var signedX = clickPos.x / Math.abs(clickPos.x); //either -1 or 1 depending on what quadrant of the shape the user clicks
        var signedY = clickPos.y / Math.abs(clickPos.y); //x = -1 in Q2 and Q3, x = -1 in Q1 and Q2
        var centerDist = clickPos.length; //distance from center of shape to clicked point
        const SCALING_FACTOR = 1;
        var scaleX = 1 + (draggedVect.x * signedX * SCALING_FACTOR) / centerDist;
        var scaleY = 1 + (draggedVect.y * signedY * SCALING_FACTOR) / centerDist;

        if (event.modifiers.shift) {
          scaleY = scaleDelta.y * scaleX / scaleDelta.x;
          scaleX = scaleDelta.x * scaleX / scaleDelta.x;
        }

        // vertical and horiz snapping feature, needs work
        // else {
        //   console.log('draggedVect.y ' + draggedVect.y);
        //   console.log('draggedVect.x ' + draggedVect.x);
        //   if (Math.abs(draggedVect.y/draggedVect.x) > 20) {
        //     console.log('y threshold');
        //     scaleX = 1;
        //   }
        //   else if (Math.abs(draggedVect.x/draggedVect.y) > 20) {
        //     console.log('x threshold');
        //     scaleY = 1;
        //   }
        // }

        var data = {};
        data.set = true;
        data.scaling_delta = {
          x: scaleX,
          y: scaleY,
          operator: 'set'
        };
        this.modifyGeometry(data, event.modifiers);
      }
    },

    getRelativePoint: function() {

      if (literal) {

        return literal.position;
      }
      return null;
    },

    dblClick: function(event) {
      if (this.currentPaths.length > 0) {
        this.trigger('moveDownNode', this.currentPaths[this.currentPaths.length - 1]);
      } else {
        this.trigger('moveUpNode');
      }
    },


    //mouse up event
    mouseUp: function(event) {
      var selected_shapes = this.get('selected_shapes');
      for (var i = 0; i < selected_shapes.length; i++) {

        if (copyInitialized) {
          copyInitialized = false;
        }
      }
      literal = null;
      segments = [];
      handle = null;
      copyReset = true;

    },



  });

  return SelectToolModel;

});