define([
  'onion/model',
  'onion/class_declarations',
  'onion/utils/extend',
  'onion/utils/object_signature'
  ], function (Model, classDeclarations, extend, objectSignature) {

  return Model.sub("AppState")

    .use(classDeclarations, 'state')

    .after('init', function () {
      this.__states__ = {}
      this.__applyClassDeclarations__('state')
    })

    .proto({

      currentState: function () {
        return this.__currentState__
      },

      setCurrentState: function (name, params) {
        this.__currentState__ = {name: name, params: params}
      },

      state: function (name, opts) {
        this.__states__[name] = opts
      },

      save: function (name) {
        var params = this.__getState__(name).toParams.call(this)
        this.setCurrentState(name, params)
        this.emit('save', name, params)
      },

      load: function (name, params) {
        if( this.matchesCurrentState(name, params) ) return
        this.run(name, params)
        this.setCurrentState(name, params)
      },

      run: function (name, params) {
        return this.__getState__(name).fromParams.call(this, extend({}, params))
      },

      matchesCurrentState: function (name, params) {
        var currentState = this.currentState()
        return currentState &&
          currentState.name === name &&
          objectSignature(currentState.params) === objectSignature(params)
      },

      __getState__: function (name) {
        var state = this.__states__[name]
        if (!state) { throw new Error("no such state " + name) }
        return state
      }

    })

})
