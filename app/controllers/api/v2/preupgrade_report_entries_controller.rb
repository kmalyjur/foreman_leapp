# frozen_string_literal: true

module Api
  module V2
    class PreupgradeReportEntriesController < ::Api::V2::BaseController
      include ApiAuthorizer

      api :GET, '/preupgrade_reports/:preupgrade_report_id/preupgrade_report_entries',
        N_('List entries for a Preupgrade report')
      param :preupgrade_report_id, :identifier, required: true
      param :search, String, required: false, desc: N_('Filter entries')
      param :order, String, required: false, desc: N_('Sort entries, e.g. "title ASC"')
      param :page, :number, required: false, desc: N_('Page number')
      param :per_page, :number, required: false, desc: N_('Items per page')
      def index
        @total = resource_scope.count
        @preupgrade_report_entries = resource_scope_for_index
        @subtotal = @preupgrade_report_entries.total_entries
      end

      protected

      def resource_scope
        @preupgrade_report ||= PreupgradeReport.find(params[:preupgrade_report_id])
        @preupgrade_report.preupgrade_report_entries
      end
    end
  end
end
