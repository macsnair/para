/*ListNode.js
 * class for collections of user created objects
 */

define([
  'jquery',
  'underscore',
  'paper',
  'models/data/Instance',
  'utils/PFloat',
  'utils/PConstraint',
  'utils/TrigFunc'

], function($, _, paper, Instance, PFloat, PConstraint, TrigFunc) {

  var ListNode = Instance.extend({
    defaults: _.extend({}, Instance.prototype.defaults, {
      name: 'list',
      type: 'collection',
      member_count: null,
      open: false, //indicates whether list is open or not;
    }),

    initialize: function() {
      Instance.prototype.initialize.apply(this, arguments);
      this.members = [];
      this.offsets = [];
      this.set('member_count', new PFloat(0));
      this.get('translation_delta').setNull(false);
      this.get('scaling_delta').setNull(false);
      this.get('rotation_delta').setNull(false);
      this.get('fill_color').setNull(false);
      this.get('stroke_color').setNull(false);
      this.get('stroke_width').setNull(false);
    },

    /*modifyProperty
    passes modifications onto members
     */
    modifyProperty: function(data, mode, modifier) {

      for (var i = 0; i < this.members.length; i++) {
        this.members[i].modifyProperty(data, mode, modifier);
      }
      for (var p in data) {
        if (data.hasOwnProperty(p)) {
          this.trigger('change:' + p);
        }
      }
    },


    printMembers: function() {
      var ids = [];
      for (var i = 0; i < this.members.length; i++) {

        if (this.members[i].get('type') === 'collection') {
          this.members[i].printMembers();
        }
        ids = ids.concat(this.members[i].get('id'));
      }
      console.log('total members for', this.get('id'), ids.length, ids);
    },

    /* addMember, removeMember
     * methods for adding and removing members from the list
     * accepts both arrays and single objects as arguments */
    addMember: function(data) {
      var translation_delta = this.accessProperty('translation_delta');
      var neg_delta = {
        x: -translation_delta.x,
        y: -translation_delta.y
      };
      if (data instanceof Array) {
        for (var i = 0; i < data.length; i++) {

          data[i].modifyProperty({
            'translation_delta': neg_delta
          });
          this.listenTo(data[i], 'delete', this.deleteMember);
          this.members.push(data[i]);
        }
      } else {

        data.modifyProperty({
          'translation_delta': neg_delta
        });
        this.listenTo(data, 'delete', this.deleteMember);
        this.members.push(data);
      }

      var md = {};
      md.member_count = {
        val: this.members.length,
        operator: 'set'
      };
      this.modifyProperty(md);
      //this.computeCentroid();

    },

    computeCentroid: function() {
      var sumX = 0;
      var sumY = 0;
      this.members.forEach(function(m) {
        var pos = m._temp_matrix.translation;


        sumX += pos.x;
        sumY += pos.y;
      });

      return {
        x: sumX / this.members.length,
        y: sumY / this.members.length
      };

    },

    // sets the geom visibility to false
    hide: function() {
      for (var i = 0; i < this.members.length; i++) {
        this.members[i].hide();
      }
    },

    show: function() {
      for (var i = 0; i < this.members.length; i++) {
        this.members[i].show();
      }
    },

    bringToFront: function() {
      for (var i = 0; i < this.members.length; i++) {
        this.members[i].bringToFront();
      }
    },


    addMemberToOpen: function(data) {
      if (this.get('open')) {
        var addedToList = false;
        for (var i = 0; i < this.members.length; i++) {
          addedToList = addedToList ? true : this.members[i].addMemberToOpen(data);
        }
        if (addedToList) {
          if (data.get('type') === 'collection') {
            for (var j = 0; j < data.members.length; j++) {
              var removed = this.removeMember(data.members[j]);
            }
          }
          this.addMember(data);
          return true;
        } else {
          return true;
        }
      }
      return false;
    },

    /* removeAllMembers;
     * removes all members from this list
     */
    removeAllMembers: function() {
      for (var i = this.members.length - 1; i >= 0; i--) {
        this.removeMember(this.members[i]);
      }
    },

    /* deleteMember
     * callback triggered when a member is deleted by some other entity
     */
    deleteMember: function(target) {
      this.stopListening(target);
      this.removeMember(target);
      this.computeCentroid();
    },

    removeMember: function(data) {
      var index = $.inArray(data, this.members);
      if (index === -1) {
        return false;
      } else {
        var member = this.members.splice(index, 1)[0];
        member.modifyProperty({
          'translation_delta': this.accessProperty('translation_delta')
        });
        var md = {};
        md.member_count = {
          val: this.members.length,
          operator: 'set'
        };
        this.modifyProperty(md);
        return member;
      }

    },

    /*recRemoveMember
     * attempts to remove an item recursively
     * returns item if item is removed,
     */
    recRemoveMember: function(data) {
      var removedItems = [];
      var selfRemoved = this.removeMember(data);
      if (selfRemoved) {
        removedItems.push(selfRemoved);
      } else {
        for (var i = 0; i < this.members.length; i++) {
          var removed = this.members[i].recRemoveMember(data);
          if (removed) {
            removedItems = removedItems.comcat(removed);
          }
        }
      }
      if (removedItems.length > 1) {
        return removedItems;
      }

    },

    /* hasMember, getMember
     * recursive methods for checking if instance exists in
     * list or sublist and accessing said parent list */

    hasMember: function(member, top) {
      if (!top) {
        if (this === member) {
          return true;
        }
      }
      for (var i = 0; i < this.members.length; i++) {
        if (this.members[i].hasMember(member)) {
          return true;
        }
      }
      return false;
    },

    getMember: function(member) {

      for (var i = 0; i < this.members.length; i++) {
        var m = this.members[i].getMember(member);
        if (m) {
          if (this.get('open')) {
            return m;
          } else {
            return this;
          }
        }
      }
      return null;
    },

    /* getListMembers
     * returns all members of this list which are themselves lists
     */
    getListMembers: function() {
      return this.members.filter(function(member) {
        return member.get('type') === 'collection';
      });
    },

    //returns all non-list members
    getInstanceMembers: function(memberList) {
      if (!memberList) {
        memberList = [];
      }
      for (var i = 0; i < this.members.length; i++) {
        if (this.members[i].get('type') !== 'collection') {
          memberList.push(this.members[i]);
        } else {
          this.members[i].getInstanceMembers(memberList);
        }

      }
      return memberList;
    },


    propertyModified: function(event) {
      for (var i = 0; i < this.members.length; i++) {
        this.members[i].trigger('modified', this.members[i]);
      }
    },



    getMemberNumber: function() {
      return this.accessProperty('member_count');
    },
    /*closeMembers
     * recursively closes all members
     *of this list
     */
    closeAllMembers: function() {
      for (var i = 0; i < this.members.length; i++) {
        if (this.members[i].get('type') === 'collection') {
          this.members[i].closeAllMembers();
          this.members[i].set('open', false);
        }
      }
    },

    toggleOpen: function(item) {
      if (this.hasMember(item)) {
        if (!this.get('open')) {
          this.set('open', true);
          return [this];
        } else {
          var toggledLists = [];
          for (var i = 0; i < this.members.length; i++) {
            var toggled = this.members[i].toggleOpen(item);
            if (toggled) {
              toggledLists = toggledLists.concat(toggled);
            }
          }
          return toggledLists;
        }
      }
      return null;
    },

    toggleClosed: function(item) {
      if (this.hasMember(item)) {
        var toggledLists = [];
        for (var i = 0; i < this.members.length; i++) {
          var toggled = this.members[i].toggleClosed(item);
          if (toggled) {
            toggledLists = toggledLists.concat(toggled);
          }
        }
        if (toggledLists.length > 0) {
          return toggledLists;
        } else {
          if (this.get('open')) {
            this.set('open', false);
            return [this];
          }
        }
      }
      return null;
    },


    compile: function() {
 
    },


    
    //triggered on change of select property, removes bbox
    selectionChange: function() {
      Instance.prototype.selectionChange.call(this, arguments);
      if (!this.get('selected')) {
        this.get('ui').visible = false;
      }
    },

    render: function() {
      var bbox = this.renderBoundingBox();
      bbox.selectedColor = this.getSelectionColor();
      bbox.selected = this.get('selected');
      this.set('geom', null);
      this.set('geom', bbox);
      if (this.get('open')) {
        bbox.strokeColor = new paper.Color(255, 0, 0, 0.5);
        bbox.strokeWidth = 1;
      }
    },

    renderBoundingBox: function() {
      for (var k = 0; k < this.members.length; k++) {
        this.updateBoundingBox(this.members[k]);
      }

      var i_bbox = this.get('i_bbox');
      if (i_bbox.bottomRight) {
        var width = i_bbox.bottomRight.x - i_bbox.topLeft.x;
        var height = i_bbox.bottomRight.y - i_bbox.topLeft.y;
        var bbox = new paper.Path.Rectangle(i_bbox.topLeft, new paper.Size(width, height));
        this.set('bbox', bbox);
        bbox.sendToBack();
        this.updateScreenBounds(bbox);
        return bbox;
      }
    },

    toJSON: function() {
      var data = Instance.prototype.toJSON.call(this, arguments);
      var memberIds = [];
      _.each(this.members, function(item) {
        memberIds.push(item.get('id'));
      });
      data.members = memberIds;

      return data;
    },

    getShapeClone: function() {
      var clone = new paper.Group(this.members.map(function(instance) {
        return instance.getShapeClone();
      }));
      return clone;
    }


  });

  return ListNode;


});