# frozen_string_literal: true

require 'test_plugin_helper'

module Api
  module V2
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
        assert_not_empty body['results']
        assert_not_nil body['total']
        assert_not_nil body['subtotal']
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
          assert_equal @report.id, JSON.parse(@response.body)['id']
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

      test 'should filter entries by search on :show' do
        get :show, params: { id: @report.id, search: "title = \"#{@entry.title}\"" }
        assert_response :success
        body = JSON.parse(@response.body)
        assert_equal 1, body['results'].length
        assert_equal @entry.id, body['results'].first['id']
      end

      test 'should sort entries on :show' do
        FactoryBot.create(:preupgrade_report_entry, host: @host, preupgrade_report: @report,
                          title: 'Aaa first alphabetically')
        get :show, params: { id: @report.id, order: 'title ASC' }
        assert_response :success
        titles = JSON.parse(@response.body)['results'].map { |e| e['title'] }
        assert_equal titles.sort, titles
      end

      test ':show always returns paginated results with total and subtotal' do
        get :show, params: { id: @report.id }
        assert_response :success
        body = JSON.parse(@response.body)
        assert_not_empty body['results']
        assert_not_nil body['total']
        assert_not_nil body['subtotal']
        assert_equal body['total'], body['subtotal']
      end
    end
  end
end
