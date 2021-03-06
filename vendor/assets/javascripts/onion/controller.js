if(typeof define!=='function'){var define=require('amdefine')(module);}

define([
    'onion/class_declarations',
    'onion/extend',
    'onion/type',
    'onion/subscriber',
    'onion/decorator',
    'onion/has_uuid'
  ], function(
    classDeclarations,
    extend,
    Type,
    subscriber,
    decorator,
    hasUUID
) {

  var isFunction = function (object) {
    return typeof object === 'function'
  }

  var toKey = function (key1, key2) {
    return [key1, key2].join(' ')
  }

  return Type.sub('Controller')

    .use(hasUUID)

    .proto(subscriber)

    .after('init', function(models, opts){
      if(!opts) opts = {}

      // Models
      this.models = extend({}, models)
      this.__registerModels__()
      this.__disabledModelListeners__ = {}

      // View
      this.view = opts.view || this.initView()
      this.__setUpViewDecorators__()
      this.__setUpViewListeners__()

      // Children
      this.children = {}
      this.__firstItemId__ = 0
      this.__nextItemIds__ = {}
    })

    .use(classDeclarations, 'onView')

    .extend({
      models: function(){
        if(!this.__requiredModels__) this.__requiredModels__ = []
        var arg
        for(var i=0; i<arguments.length; i++){
          var modelName = arguments[i]
          if(this.__requiredModels__.indexOf(modelName) == -1){
            this.__requiredModels__.push(modelName)
          }
        }
        return this
      },

      onModelSubscriptions: function(modelName){
        if(!this.__onModelSubscriptions__) this.__onModelSubscriptions__ = {}
        if(!this.__onModelSubscriptions__[modelName]) this.__onModelSubscriptions__[modelName] = []
        return this.__onModelSubscriptions__[modelName]
      },

      onModel: function(modelName, eventNames, callbackOrMethodName){
        if(typeof eventNames === 'string') eventNames = [eventNames]
        eventNames.forEach(function (eventName) {
          this.onModelSubscriptions(modelName).push({
            eventName: eventName,
            callbackOrMethodName: callbackOrMethodName
          })
        }, this)
        return this
      },

      view: function (ViewClass) {
        this.prototype.initView = function () { return new ViewClass() }
        return this
      }
    })

    .proto({
      destroy: function(){
        this.unsubscribeAll()
        this.destroyChildren()
        if(this.view) this.view.destroy()
      },

      // Models

      newModel: function(name, model){
        this.models[name] = model
        this[name] = model
        this.__createModelSubscriptionsFor__(name)
        return model
      },

      disableModelListener: function (modelName, eventName) {
        this.__disabledModelListeners__[toKey(modelName, eventName)] = true
      },

      enableModelListener: function (modelName, eventName) {
        delete this.__disabledModelListeners__[toKey(modelName, eventName)]
      },

      disablingModelListener: function (modelName, eventName, callback) {
        this.disableModelListener(modelName, eventName)
        callback.call(this)
        this.enableModelListener(modelName, eventName)
      },

      // Views

      initView: function () {
        // Override me
      },

      ready: function () {
        // Override me
      },

      onView: function (event, handler) {
        if (!this.view) {
          throw new Error("there is no view to subscribe to")
        }
        var callback = this.__callbackFrom__(handler)
        this.subscribe(this.view, event, callback)
      },

      appendTo: function(element){
        this.view.appendTo(element)
      },

      anchorAt: function(element){
        if (this.view) {
          this.view.anchorAt(element)
        }
        else {
          throw new Error(this.constructor.name+" does not have a view. Please provide one before calling `anchorAt()`")
        }
        return this
      },

      // Children

      setChild: function(id, child, models, opts){
        opts = opts || {anchor: false}
        if( isFunction(child) ) child = this.__newChild__(child, models, opts)

        var childId, itemId
        if (Array.isArray(id)) {
          childId = id[0]
          itemId = id[1]
        }
        else {
          childId = id
          itemId = this.__firstItemId__
        }

        if (typeof this.children[childId] === 'undefined') {
          this.children[childId] = {}
        }

        if (this.children[childId][itemId]) {
          this.children[childId][itemId].destroy()
        }

        this.children[childId][itemId] = child

        this.insertChild(child, childId, itemId, opts.anchor)
        return child
      },

      getChild: function(id) {
        var child
        if (Array.isArray(id)) {
          var childId = id[0]
          var itemId = id[1]
          child = this.children[childId][itemId]
        }
        else {
          var key = Object.keys(this.children[id])[0]
          child = this.children[id][key]
        }
        return child
      },

      addChild: function(id, child, models, options){
        if (Array.isArray(id)) {
          throw new Error("`addChild` can only receive simple ids. Instead, " + id + " was received")
        }
        return this.setChild([id, this.__nextItemId__(id)], child, models, options)
      },

      destroyChildren: function() {
        var key
        for(key in this.children) {
          this.destroyChild(key)
        }
      },

      destroyChild: function(id) {
        if (Array.isArray(id)) {
          var childId = id[0], itemId = id[1]
          var child = this.children[childId]
          var item = child[itemId]
          delete child[itemId]
          item.destroy()
        }
        else {
          var child = this.children[id]
          delete this.children[id]
          if(child) {
            for(var key in child) {
              child[key].destroy()
            }
          }
        }
      },

      insertChild: function(child, id, itemId, anchor){
        this.view.insertChild(child.view, id, itemId, anchor)
      },

      // "Private"

      __newChild__: function(ctor, models, options){
        var childModels = extend({}, this.models, models)
        return new ctor(childModels, options)
      },

      __registerModels__: function(){
        var requiredModels = this.constructor.__requiredModels__
        if(!requiredModels) { return }

        var name
        for(var i=0; i<requiredModels.length; i++){
          name = requiredModels[i]
          if(typeof this.models[name] !== 'undefined'){
            this[name] = this.models[name]
            this.__createModelSubscriptionsFor__(name)
          } else {
            throw new Error(this.constructor.name+" missing model "+name)
          }
        }
      },

      __createModelSubscriptionsFor__: function(modelName){
        this.constructor.onModelSubscriptions(modelName).forEach(function (sub) {
          this.subscribe(this.models[modelName], sub.eventName, function () {
            var callback = this.__callbackFrom__(sub.callbackOrMethodName)
            if (this.__isModelListenerEnabled__(modelName, sub.eventName)) {
              callback.apply(this, arguments)
            }
          })
        }, this)
      },

      __isModelListenerEnabled__: function (modelName, eventName) {
        return !this.__disabledModelListeners__[toKey(modelName, eventName)]
      },

      __setUpViewDecorators__: function () {
        if (!this.view) {
          return
        }
        var self = this
        decorator.after(this.view, 'setDom', function () {
          self.ready()
        })
      },

      __setUpViewListeners__: function () {
        this.__applyClassDeclarations__('onView')
      },

      __callbackFrom__: function (callbackOrMethodName) {
        if( isFunction(callbackOrMethodName) ) {
          return callbackOrMethodName
        } else {
          var callback = this[callbackOrMethodName]
          if(!callback) throw new Error("Can't find method '"+callbackOrMethodName+"'")
          return callback
        }
      },

      __nextItemId__: function (id) {
        if (typeof this.__nextItemIds__[id] === 'undefined') {
          this.__nextItemIds__[id] = this.__firstItemId__
        }
        return this.__nextItemIds__[id]++
      }

    })

})
