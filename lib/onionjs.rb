module Onionjs
  class Engine < Rails::Engine

    initializer "onionjs" do |app|
      app.config.assets.paths << app.root.join('app/assets/modules')

      # If requirejs-rails is present, include mustache files in
      # rake assets:precompile task (which uses r.js)
      if app.config.respond_to?(:requirejs)
        app.config.requirejs.logical_path_patterns += [/\.mustache$/]
      end

      ActionView::Base.send :include, Onionjs::Helper
    end

  end
end
