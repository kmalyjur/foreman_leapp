# frozen_string_literal: true

class PreupgradeReportEntriesController < ApplicationController
  include Foreman::Controller::AutoCompleteSearch

  # rubocop:disable Rails/LexicallyScopedActionFilter
  skip_before_action :authorize, only: %i[auto_complete_search]
  before_action :authorize_autocomplete, only: %i[auto_complete_search]
  # rubocop:enable Rails/LexicallyScopedActionFilter

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
      render json: {
        error: {
          message: _('Missing one of the required permissions: view_job_invocations'),
          missing_permissions: ['view_job_invocations'],
        },
      }, status: :forbidden
      return
    end

    return if User.current.can?('view_hosts')

    render json: {
      error: {
        message: _('Missing one of the required permissions: view_hosts'),
        missing_permissions: ['view_hosts'],
      },
    }, status: :forbidden
  end

  def action_permission
    'view'
  end

  def controller_permission
    'job_invocations'
  end
end
