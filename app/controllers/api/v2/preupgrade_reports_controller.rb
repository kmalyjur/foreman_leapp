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
        base_scope = @preupgrade_report.preupgrade_report_entries

        # --- 1. Handle Custom Sorting Logic ---
        order_param = params[:order] || 'severity DESC'
        custom_order = nil
        search_order = order_param # Default: let scoped_search handle it

        if order_param.include?('has_remediation')
          # Sort by presence of "remediations" key in the detail column
          # Cast to ::text ensures it works for both JSONB and String columns
          direction = order_param.split(' ').last || 'DESC'
          custom_order = "CASE WHEN detail::text LIKE '%\"remediations\"%' THEN 1 ELSE 0 END #{direction}"
          search_order = nil # Disable scoped_search sorting for this case
        
        elsif order_param.include?('inhibitor')
          # Sort by presence of "inhibitor" string in the flags column
          direction = order_param.split(' ').last || 'DESC'
          custom_order = "CASE WHEN flags::text LIKE '%inhibitor%' THEN 1 ELSE 0 END #{direction}"
          search_order = nil
        end

        # --- 2. Apply Search (Filter) ---
        # We pass 'search_order' here. If it's nil, search_for only filters.
        search_scope = base_scope.search_for(params[:search], order: search_order)

        # --- 3. Apply Custom Sort (If needed) ---
        search_scope = search_scope.order(Arel.sql(custom_order)) if custom_order

        # --- 4. Pagination ---
        @preupgrade_report_entries = search_scope.paginate(
          page: params[:page] || 1,
          per_page: params[:per_page] || 5
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