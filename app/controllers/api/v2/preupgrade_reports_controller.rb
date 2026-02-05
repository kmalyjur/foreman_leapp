# frozen_string_literal: true

module Api
  module V2
    class PreupgradeReportsController < ::Api::V2::BaseController
      include ApiAuthorizer

      layout 'api/v2/layouts/index_layout', except: %i[show]

      api :GET, '/preupgrade_reports/', N_('List Preupgrade reports')
      param_group :search_and_pagination, ::Api::V2::BaseController
      def index
        @preupgrade_reports = resource_scope_for_index
      end

      api :GET, '/preupgrade_reports/:id', N_('Show Preupgrade report')
      param :id, :identifier, required: true
      param_group :search_and_pagination, ::Api::V2::BaseController
      def show
        @preupgrade_report = PreupgradeReport.find(params[:id])

        # This applies the sorting (order), searching, and pagination from the URL params
        @preupgrade_report_entries = @preupgrade_report.preupgrade_report_entries.search_for(
          params[:search],
          :order => params[:order],
          :page => params[:page],
          :per_page => params[:per_page]
        )
      end

      api :GET, '/job_invocations/:id/preupgrade_reports', N_('List Preupgrade reports for Job invocation')
      param :id, :identifier, required: true
      def job_invocation
        @preupgrade_reports = resource_scope_for_index.where(job_invocation_id: params[:id])
      end

      private

      def path_to_authenticate
        params['action'] = 'show' if params['action'] == 'job_invocation'
        Foreman::AccessControl.normalize_path_hash params.slice(:action, :id, :user_id)
                                                         .merge({ controller: 'api/v2/job_invocations' })
      end
    end
  end
end