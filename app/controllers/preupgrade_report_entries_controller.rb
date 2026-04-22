# frozen_string_literal: true

class PreupgradeReportEntriesController < ApplicationController
  include Foreman::Controller::AutoCompleteSearch

  skip_before_action :authorize, only: [:auto_complete_search]
  before_action :authorize_autocomplete, only: [:auto_complete_search]

  def index
    @preupgrade_report_entries = resource_scope
                                   .search_for(params[:search], order: params[:order])
                                   .paginate(paginate_options)
    render 'api/v2/preupgrade_report_entries/index'
  end

  protected

  def model_of_controller
    PreupgradeReportEntry.joins(:host).merge(Host.authorized(:view_hosts, Host))
  end

  def resource_scope
    model_of_controller
  end

  private

  def authorize_autocomplete
    unless User.current.can?('view_job_invocations')
      render json: { error: { message: _('Missing one of the required permissions: view_job_invocations'),
                               missing_permissions: ['view_job_invocations'] } },
             status: :forbidden
      return
    end

    unless User.current.can?('view_hosts')
      render json: { error: { message: _('Missing one of the required permissions: view_hosts'),
                               missing_permissions: ['view_hosts'] } },
             status: :forbidden
    end
  end

  def action_permission
    'view'
  end

  def controller_permission
    'job_invocations'
  end
end
