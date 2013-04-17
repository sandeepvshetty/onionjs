if(typeof define!=='function'){var define=require('amdefine')(module);}

define([
  'onion/class_declarations',
  'onion/event_emitter',
  'onion/type',
  'jquery'
], function(classDeclarations, eventEmitter, Type, $){

  return Type.sub('ProgressiveView')

    .proto(eventEmitter)

    .use(classDeclarations, 'onDom')

    .proto({
      setDom: function (dom) {
        dom = $(dom)[0]
        this.__dom__ = dom
        this.__setUpDomListeners__()
        return this
      },

      dom: function () {
        if(!this.__dom__) throw new Error("the dom hasn't yet been set in "+this.constructor.name)
        return this.__dom__
      },

      $dom: function () {
        return $(this.dom())
      },

      onDom: function (selector, event, newEvent, argumentsMapper) {
        var self = this
        this.$dom().on(event, selector, function (event) {
          event.stopPropagation()
          event.preventDefault()

          if(argumentsMapper) {
            self.emit(newEvent, argumentsMapper.call(self, this, event))
          } else {
            self.emit(newEvent)
          }
        })
        return this
      },

      __setUpDomListeners__: function () {
        this.__applyClassDeclarations__('onDom')
      },

      appendTo: function (element) {
        this.setDom(element)
        return this
      },

      find: function (selector) {
        return $(this.dom()).find(selector)
      },

      insertChild: function(childView, id, itemId){
        if (childView.appendTo) {
          var container = this.find('[data-child]').filter(function () {
            return $(this).data('child').match(new RegExp('\\b' + id + '\\b'))
          })
          if (itemId) {
            var item = container.children('[data-child-item="' + itemId + '"]')
            if (item.length != 0) {
              container = item
            }
          }
          if(container.length === 0) container = this.$dom()
          childView.appendTo(container)
        }
        return this
      }

    })

    .after('init', function (options) {
      if(!options) options = {}

      if(options.dom) this.setDom(options.dom)
    })

})
