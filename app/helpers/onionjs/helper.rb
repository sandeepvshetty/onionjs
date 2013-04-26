module Onionjs
  module Helper

    def onionjs_app(app_name, preloaded_data={}, opts={})
      app_path = opts[:app_path] || "#{app_name}/#{app_name}_controller"
      base = (opts[:base] || "#app").html_safe
      pre_require = opts[:pre_require]
      action = opts[:anchor] ? 'anchorAt' : 'appendTo'

      requires = [app_path] + Array.wrap(pre_require)
      controller_name = "#{app_name}_controller".camelize

      html = ""

      html << %(
        <script type="text/javascript">
          require(#{requires.to_json}, function(#{controller_name}){
            window.app = new #{controller_name}({
              preloadedData: #{preloaded_data.to_json}
            }).#{action}('#{base}')
          })
        </script>
      )

      if opts[:base].blank?
        html << %(<div id="#{id}"></div>)
      end

      html.html_safe
    end

  end
end
