# frozen_string_literal: true

Rails.application.routes.draw do
  resources :preupgrade_reports, :only => %i[index]

  resources :preupgrade_report_entries, only: [] do
    collection do
      get :auto_complete_search
    end
  end

  namespace :api, defaults: { format: 'json' } do
    scope '(:apiv)', module: :v2, defaults: { apiv: 'v2' }, apiv: /v2/,
      constraints: ApiConstraints.new( version: 2, default: true) do
      resources :preupgrade_reports, only: %i[index show]
      get 'job_invocations/:id/preupgrade_reports', to: 'preupgrade_reports#job_invocation'
    end
  end
end
