# frozen_string_literal: true

require 'test_plugin_helper'

module Api
  module V2
    # rubocop:disable Metrics/ClassLength
    class PreupgradeReportsControllerTest < ActionController::TestCase
      setup do
        @host = FactoryBot.create(:host)
        @job_invocation = FactoryBot.create(:job_invocation)
        @report = FactoryBot.create(:preupgrade_report, host: @host, job_invocation: @job_invocation)
        @entry = FactoryBot.create(:preupgrade_report_entry, host: @host, preupgrade_report: @report)
      end

      test 'should get :index' do
        get :index
        assert_response :success
        assert_not_empty JSON.parse(@response.body)['results']
      end

      test 'should get :show' do
        get :show, params: { id: @report.id }
        assert_response :success

        body = JSON.parse(@response.body)
        assert_equal @report.id, body['id']
        assert_nil body['results']
      end

      test 'should get :job_invocation' do
        get :job_invocation, params: { id: @job_invocation.id }
        assert_response :success
        assert_not_empty JSON.parse(@response.body)['results']
      end

      context 'with permissions' do
        setup do
          @user = FactoryBot.create(:user, admin: false)
          setup_user('view', 'job_invocations', nil, @user)
          setup_user('view', 'hosts', nil, @user)
        end

        test 'should get :index' do
          get :index, session: set_session_user(@user)
          assert_response :success
          assert_not_empty JSON.parse(@response.body)['results']
        end

        test 'should get :show' do
          get :show, params: { id: @report.id }, session: set_session_user(@user)
          assert_response :success
          json = ActiveSupport::JSON.decode(@response.body)
          assert_equal @report.id, json['id']
          assert_nil json['results']
        end

        test 'should get :job_invocation' do
          get :job_invocation, params: { id: @job_invocation.id }, session: set_session_user(@user)
          assert_response :success
          assert_not_empty JSON.parse(@response.body)['results']
        end
      end

      context 'without :view_job_invocations' do
        setup do
          @user = FactoryBot.create(:user, admin: false)
          setup_user('view', 'hosts', nil, @user)
        end

        test 'should not get :index' do
          get :index, session: set_session_user(@user)
          assert_response :forbidden
          assert_includes JSON.parse(@response.body)['error']['missing_permissions'], 'view_job_invocations'
        end

        test 'should not get :show' do
          get :show, params: { id: @report.id }, session: set_session_user(@user)
          assert_response :forbidden
          assert_includes JSON.parse(@response.body)['error']['missing_permissions'], 'view_job_invocations'
        end

        test 'should not get :job_invocation' do
          get :job_invocation, params: { id: @job_invocation.id }, session: set_session_user(@user)
          assert_response :forbidden
          assert_includes JSON.parse(@response.body)['error']['missing_permissions'], 'view_job_invocations'
        end
      end

      context 'without :view_hosts' do
        setup do
          @user = FactoryBot.create(:user, admin: false)
          setup_user('view', 'job_invocations', nil, @user)
        end

        test 'should not get :index' do
          get :index, session: set_session_user(@user)
          assert_response :forbidden
          assert_includes JSON.parse(@response.body)['error']['missing_permissions'], 'view_hosts'
        end

        test 'should not get :show' do
          get :show, params: { id: @report.id }, session: set_session_user(@user)
          assert_response :forbidden
          assert_includes JSON.parse(@response.body)['error']['missing_permissions'], 'view_hosts'
        end

        test 'should not get :job_invocation' do
          get :job_invocation, params: { id: @job_invocation.id }, session: set_session_user(@user)
          assert_response :forbidden
          assert_includes JSON.parse(@response.body)['error']['missing_permissions'], 'view_hosts'
        end
      end
    end
    # rubocop:enable Metrics/ClassLength
  end
end
