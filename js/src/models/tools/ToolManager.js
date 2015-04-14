/*ToolCollection.js
 * a collection that contains all of the tool models
 */

define([
  'jquery',
  'underscore',
  'backbone',
  'models/tools/BaseToolModel',
  'models/tools/SelectToolModel',
  'models/tools/PolyToolModel',
  'models/tools/ConstraintToolModel',
  'utils/Utils'
], function($, _, Backbone, BaseToolModel, SelectToolModel, PolyToolModel, ConstraintToolModel, Utils) {

  var toolNameMap;
  var ToolManager = Backbone.Model.extend({


    defaults: {
      state: 'polyTool',
      'tool_mode': 'standard',
      'tool_modifier': 'none',
    },
    events: {

      'change:tool-mode': this.modeChanged,
      'change:tool-modifier': this.modeChanged
    },


    initialize: function() {
      var selectTool = new SelectToolModel({
        id: 'selectTool'
      });
      var polyTool = new PolyToolModel({
        id: 'polyTool'
      });
      var model = this;
      var constraintTool = new ConstraintToolModel({
        id: 'constraintTool',
      });

      constraintTool.set('sm', this);
      var toolCollection = new Backbone.Collection({});
      this.set('tool_collection', toolCollection);
      this.listenTo(toolCollection, 'geometryAdded', this.geometryAdded);
      this.listenTo(toolCollection, 'geometrySelected', this.geometrySelected);
      this.listenTo(toolCollection, 'geometeryDSelected', this.geometeryDSelected);
      this.listenTo(toolCollection, 'geometryModified', this.geometryModified);
      this.listenTo(toolCollection, 'geometrySegmentModified', this.geometrySegmentModified);
      this.listenTo(toolCollection, 'delegateMethod', this.delegateMethod);
      this.listenTo(toolCollection, 'constraintSet', this.constraintSet);

      this.get('tool_collection').add([selectTool, polyTool, constraintTool]);
      console.log('tool models', this.get('tool_collection').get('polyTool'));
      //setup user tool managers
      toolNameMap = {
        'select': selectTool,
        'poly': polyTool,
        'constraint': constraintTool
      };


    },



    setState: function(state, mode) {
      console.log('set state', this.get('state'));
      console.log('current tool', this.get('tool_collection').get(state));

      this.clearIrrelevantState();

      this.get('tool_collection').get(state).reset();
      this.set('state', state);
      if (mode) {
        var currentTool = this.get('tool_collection').get(this.get('state'));
        currentTool.set('mode', mode);
      }
    },


    modeChanged: function() {
      var models = this.get('models');
      _.each(models, function(model) {
        model.changeMode(this.tool_mode, this.tool_modifer);
      });
      this.get('selectTool').changeModeForSelection();
      this.trigger('compileRequest');
    },

    /*
     * Tell the tool to advance its state.
     */
    advanceTool: function() {
      var tool = this.get('tool_collection').get(this.get('state'));
      tool.advance();
    },

    clearIrrelevantState: function() {
      var state = this.get('state');
      switch (state) {
        case 'constraintTool':
          this.get('constraintTool').clearState();
          break;
        default:
      }
      this.trigger('compileRequest');
    },


    resetTools: function() {
      this.get('tool_collection').get(this.get('state')).reset();

    },

    getToolByName: function(toolName) {
      return toolNameMap[toolName];
    },

    /*
     * Requests a particular tool to call a named method. The results are passed back to the source of the delegation.
     */
    delegateMethod: function(toolName, methodName) {
      console.log('Delegating method: ' + methodName + ' to tool: ' + toolName);
      var args = Array.prototype.slice.call(arguments, 2); // extract the method arguments
      var tool = this.getToolByName(toolName);
      var method = tool[methodName];
      var result = tool[methodName].apply(tool, args);
      return result;
    },

    geometryAdded: function(instance) {
      console.log('tool collection geometryAdded');
      var selectTool = this.get('tool_collection').get('selectTool');

      selectTool.deselectAll();
      selectTool.addSelectedShape(instance);
      this.trigger('addShape', instance);
    },

    instanceAdded: function(instance) {
      this.trigger('addInstance', instance);
    },

    constraintSet: function(constraint_data) {
      this.trigger('addConstraint', constraint_data);
    },

    geometrySelected: function(instance, segments) {
      var selectTool = this.get('tool_collection').get('selectTool');
      this.trigger('selectionChanged', selectTool.get('selected_shapes'), instance, segments);
    },

    geometryModified: function(data, modifiers) {
      this.trigger('compileRequest');
    },


    geometryParamsModified: function(data) {
      var selectedShapes = this.get('tool_collection').get('selectTool').get('selected_shapes');
      for (var i = 0; i < selectedShapes.length; i++) {
        selectedShapes[i].updateParams(data);
      }
      this.trigger('compileRequest');
    },


    /*geometryDeleted
     * triggers a delete action on the visitor
     */
    deleteInstance: function() {
      var selectedShapes = this.get('tool_collection').get('selectTool').get('selected_shapes');
      this.trigger('removeShapes', selectedShapes);
      this.get('selectTool').deselectAll();
    },

    removeFromSelection: function(instances) {
      var selectTool = this.get('tool_collection').get('selectTool');
      selectTool.removeSelectedShape(instances);
      this.trigger('compileRequest');

    },

    addToSelection: function(instances) {
      var selectTool = this.get('tool_collection').get('selectTool');
      selectTool.addSelectedShape(instances);
      this.trigger('compileRequest');
    },

    selectionFiltered: function(newSelection) {
      var selectTool = this.get('tool_collection').get('selectTool');
      selectTool.removeSelectedShape(selectTool.getLastSelected());
      selectTool.addSelectedShape(newSelection);
      this.trigger('compileRequest');

    },

    createList: function() {
      var selectedShapes = this.get('tool_collection').get('selectTool').get('selected_shapes');
      if (selectedShapes.length > 0) {
        this.get('selectTool').deselectAll();
        this.trigger('addList', selectedShapes);
      }
    },

    createFunction: function() {
      var selectedShapes = this.get('tool_collection').get('selectTool').get('selected_shapes');
      if (selectedShapes.length > 0) {
        this.trigger('addFunction', selectedShapes);
      }
    },

    createParams: function() {
      var selectedShapes = this.get('tool_collection').get('selectTool').get('selected_shapes');
      if (selectedShapes.length > 0) {
        this.trigger('addParams', selectedShapes);
      }
    },

    modifyStyle: function(style_data) {
      var selectedShapes = this.get('tool_collection').get('selectTool').get('selected_shapes');
      for (var i = 0; i < selectedShapes.length; i++) {
        var instance = selectedShapes[i];
        instance.modifyProperty(style_data, this.tool_mode, this.tool_modifer);
      }
      this.trigger('compileRequest');
    },


    openSelected: function() {
      var selectedShapes = this.get('tool_collection').get('selectTool').get('selected_shapes');
      this.trigger('toggleOpen', selectedShapes);
      this.deselectAll();

    },

    /*closeSelectedGroups
     * attempts to close selected items, if they are lists
     * and updates selection accordingly
     */
    closeSelected: function() {
      var selectedShapes = this.get('tool_collection').get('selectTool').get('selected_shapes');
      this.trigger('toggleClosed', selectedShapes);
      this.deselectAll();
    },



    // TESTING
    setConstraintProperty: function(data) {
      var result = this.get('tool_collection').get('constraintTool').setConstraintProperty(data);
      this.trigger('toolViewUpdate', 'constraint', result);
    },

    setConstraintType: function(data) {
      var result = this.get('tool_collection').get('constraintTool').setConstraintType(data);
      this.trigger('toolViewUpdate', 'constraint', result);
    },

    setConstraintExpression: function(data) {
      var result = this.get('tool_collection').get('constraintTool').setConstraintExpression(data);
      this.trigger('toolViewUpdate', 'constraint', result);
    },

    toolViewUpdate: function(view, data) {

    },
    // END TESTING



    //triggered by paper tool on a mouse down event
    toolMouseDown: function(event, pan) {

      if (!event.modifiers.space && Utils.validateEvent(event)) {
        var selectedTool = this.get('tool_collection').get(this.get('state'));
        selectedTool.mouseDown(event);
      }
    },

    toolMouseUp: function(event, pan) {
      var selectedTool = this.get('tool_collection').get(this.get('state'));

      if (!event.modifiers.space && Utils.validateEvent(event)) {
        selectedTool.mouseUp(event);
      }

    },


    toolMouseDrag: function(event) {
      if (!event.modifiers.space && Utils.validateEvent(event)) {
        var selectedTool = this.get('tool_collection').get(this.get('state'));
        selectedTool.mouseDrag(event);
      }

    },


    toolMouseMove: function(event) {
      if (!event.modifers.space && Utils.validateEvent(event)) {
        var selectedTool = this.get('tool_collection').get(this.get('state'));
        selectedTool.mouseMove(event);
      }


    },
  });
  return ToolManager;
});