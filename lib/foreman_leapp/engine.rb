# frozen_string_literal: true

require 'foreman_ansible'
require 'foreman_remote_execution'

module ForemanLeapp
  class Engine < ::Rails::Engine
    engine_name 'foreman_leapp'

    # Add any db migrations
    initializer 'foreman_leapp.load_app_instance_data' do |app|
      ForemanLeapp::Engine.paths['db/migrate'].existent.each do |path|
        app.config.paths['db/migrate'] << path
      end
    end

    initializer 'foreman_leapp.register_plugin', before: :finisher_hook do |app|
      app.reloader.to_prepare do
        Foreman::Plugin.register :foreman_leapp do
          requires_foreman '>= 3.16'
          register_gettext

          apipie_documented_controllers ["#{ForemanLeapp::Engine.root}/app/controllers/api/v2/*.rb"]
          extend_template_helpers ForemanLeapp::TemplateHelper

          extend_page 'job_invocations/show' do |cx|
            cx.add_pagelet :main_tabs,
                          partial: 'job_invocations/leapp_preupgrade_report',
                          name: _('Leapp preupgrade report'),
                          id: 'leapp_preupgrade_report',
                          onlyif: proc { |subject|
                            ::Helpers::JobHelper.correct_feature?(subject, 'leapp_preupgrade') ||
                              ::Helpers::JobHelper.correct_feature?(subject, 'leapp_remediation_plan')
                          }
          end

          security_block :foreman_leapp do
            permission :view_job_invocations, { :preupgrade_reports => %i[index show job_invocation],
                                                'api/v2/preupgrade_reports' => %i[index show job_invocation] },
                                              :resource_type => 'JobInvocation'
          end

          register_global_js_file 'global'

          describe_host do
            multiple_actions_provider :leapp_hosts_multiple_actions
          end
        end
      end
    end

    # Include concerns in this config.to_prepare block
    config.to_prepare do
      begin
        ::JobInvocation.include ForemanLeapp::JobInvocationExtensions
      rescue StandardError => e
        Rails.logger.warn "ForemanLeapp: skipping engine hook (#{e})"
      end

      ForemanLeapp::Engine.register_rex_features
    end

    rake_tasks do
      Rake::Task['db:seed'].enhance do
        ForemanLeapp::Engine.load_seed
      end
    end

    initializer 'foreman_leapp.require_dynflow',
                before: 'foreman_tasks.initialize_dynflow',
                after: 'foreman_remote_execution.require_dynflow' do |_app|
      ForemanTasks.dynflow.require!
      ForemanTasks.dynflow.config.eager_load_paths << File.join(ForemanLeapp::Engine.root, 'app/lib/actions')
    end

    initializer 'foreman_leapp.apipie' do
      Apipie.configuration.checksum_path += ['/api/']
    end

    def self.register_rex_features
      RemoteExecutionFeature.register(
        :leapp_preupgrade,
        N_('Preupgrade check with Leapp'),
        description: N_('Upgradeability check for RHEL host'),
        host_action_button: true
      )

      RemoteExecutionFeature.register(
        :leapp_upgrade,
        N_('Upgrade with Leapp'),
        description: N_('Run Leapp upgrade job for RHEL host'),
        host_action_button: true
      )

      RemoteExecutionFeature.register(
        :leapp_remediation_plan,
        N_('Remediation plan'),
        description: N_('Run Remediation plan with Leapp'),
        host_action_button: false
      )
    end
  end
end
