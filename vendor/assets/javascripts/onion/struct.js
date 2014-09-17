if(typeof define!=='function'){var define=require('amdefine')(module);}

define([
  'onion/type',
  'onion/collection',
  'onion/event_emitter',
  'onion/has_uuid'
], function (Type, Collection, eventEmitter, hasUUID) {

  function setterMethodName(attributeName){
    return 'set' + attributeName.replace(/./, function(ch){ return ch.toUpperCase() })
  }

  function copy(dest, src, keys){
    var key
    for(key in src){
      if(keys && (keys.indexOf(key) == -1)) continue
      if(src.hasOwnProperty(key)){
        dest[key] = src[key]
      }
    }
    return dest
  }

  return Type.sub('Struct')

    .use(hasUUID)

    .proto(eventEmitter)

    .proto({

      __readAttribute__: function(attr) {
        return this.__attrs__[attr]
      },

      __writeAttribute__: function(attr, value) {
        this.__attrs__[attr] = value
      },

      __writeCollection__: function(collection, items) {
        this[collection]().set(items)
      },

      __writerDecoratorFor__: function (attribute) {
        var decorators = this.constructor.__writerDecorators__
        return decorators && decorators[attribute]
      },

      __write__: function(key, value) {
        var decorator = this.__writerDecoratorFor__(key)
        if (decorator) {
          var ignoreDecorator = value === null && decorator.options.includeNull != true
          if (!ignoreDecorator) {
            value = decorator.func(value)
          }
        }
        if(this.constructor.attributeNames.indexOf(key) != -1){
          this.__writeAttribute__(key, value)
        } else if (this.constructor.collectionNames.indexOf(key) != -1){
          this.__writeCollection__(key, value)
        } else {
          throw new Error("unknown attribute or collection" + key + " for " + this.constructor.name)
        }
      },

      set: function(attr, value) {
        var attrs = {}
        attrs[attr] = value
        this.setAttrs(attrs)
        return this
      },

      setAttrs: function(attrs) {
        var changes = this.__collectChanges__(attrs)
        for(key in attrs) { this.__write__(key, attrs[key]); }
        this.__notifyChanges__(changes)
      },

      attrs: function() {
        var keys
        if(arguments.length) keys = Array.prototype.slice.apply(arguments)
        return copy({}, this.__attrs__, keys)
      },

      loadAttrs: function (attrs) {
        copy(this.__attrs__, attrs)
      },

      __collectChanges__: function (attrs) {
        var changes = {}
        var newValue, oldValue
        var attr
        for (attr in attrs) {
          newValue = attrs[attr]
          oldValue = this[attr]()
          if(newValue != oldValue) {
            changes[attr] = {from: oldValue, to: newValue}
          }
        }
        return changes
      },

      __notifyChanges__: function (changes) {
        var change
        var attr
        for (attr in changes) {
          change = changes[attr]
          this.emit('change:'+attr, change)
          if (change.from == null && change.to != null) {
            this.emit('set:'+attr, change.to)
          };
          if (change.from != null && change.to == null) {
            this.emit('unset:'+attr)
          };
        }
        if (Object.keys(changes).length > 0) {
          this.emit('change', changes)
        }
        return changes
      },

      setDefaults: function (attrs) {
        for (var key in attrs) {
          if (this[key]() === undefined) {
            this[setterMethodName(key)](attrs[key])
          }
        }
      }
    })

    .extend({

      load: function (attrs) {
        var instance = new this()
        instance.loadAttrs(attrs)
        return instance
      },

      attributes: function(){
        if(!this.attributeNames) this.attributeNames = []
        var i
        for(i=0; i<arguments.length; i++){
          this.__createReader__(arguments[i])
          this.__createWriter__(arguments[i])
          this.attributeNames.push(arguments[i])
        }
        return this
      },

      collection: function (name, options) {
        if (!options) options = {};
        if (!this.collectionNames) this.collectionNames = []

        var privateName = '__' + name + '__',
            type        = options[type] || Collection;

        this.prototype[name] = function () {
          if (!this[privateName]) {
            this[privateName] = new type();
            if (options.orderBy) {
              this[privateName].orderBy(options.orderBy);
            }
          }
          return this[privateName];
        };

        this.__createWriter__(name);

        this.collectionNames.push(name);

        return this;
      },

      decorateWriter: function (attribute, decorator, options) {
        if(!this.__writerDecorators__) this.__writerDecorators__ = {}
        this.__writerDecorators__[attribute] = {func: decorator, options: (options || {})}
        return this
      },

      __createReader__: function(attr){
        this.prototype[attr] = function(){
          return this.__readAttribute__(attr)
        }
      },

      __createWriter__: function(attr){
        var methodName = setterMethodName(attr)
        this.prototype[methodName] = function(value){
          this.set(attr, value)
          return this
        }
      },

    })

    .after('init', function(attrs){
      this.__attrs__ = {}
      this.setAttrs(attrs)
    })

})

