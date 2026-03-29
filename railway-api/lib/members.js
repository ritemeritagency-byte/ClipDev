const { getUserRole, isAdminEmail, isTestAccessEmail } = require("./config");

const getMemberProfileByEmail = async (queryable, email) => {
  const result = await queryable.query(
    `
      select
        u.id as user_id,
        u.email,
        u.full_name,
        u.account_type,
        u.agency_name,
        u.goals,
        u.avatar_url,
        u.status as account_status,
        s.id as subscription_id,
        s.status as subscription_status,
        s.current_period_end,
        p.plan_code,
        p.display_name,
        coalesce(
          json_agg(
            json_build_object(
              'courseSlug', ca.course_slug,
              'accessStatus', ca.access_status,
              'grantedAt', ca.granted_at,
              'revokedAt', ca.revoked_at
            )
          ) filter (where ca.id is not null),
          '[]'::json
        ) as access
      from users u
      left join subscriptions s on s.user_id = u.id and s.status in ('pending', 'active', 'past_due')
      left join subscription_plans p on p.id = s.plan_id
      left join course_access ca on ca.user_id = u.id
      where u.email = $1
      group by u.id, s.id, p.plan_code, p.display_name
      order by s.created_at desc nulls last
      limit 1
    `,
    [email]
  );

  if (!result.rows.length) return null;

  const row = result.rows[0];
  const member = {
    id: row.user_id,
    email: row.email,
    fullName: row.full_name,
    role: getUserRole(row.email),
    isAdmin: isAdminEmail(row.email),
    accountType: row.account_type,
    agencyName: row.agency_name,
    goals: row.goals,
    avatarUrl: row.avatar_url,
    accountStatus: row.account_status,
    subscriptionId: row.subscription_id,
    subscriptionStatus: row.subscription_status,
    currentPeriodEnd: row.current_period_end,
    planCode: row.plan_code,
    planName: row.display_name,
    access: row.access,
    hasTestAccess: isTestAccessEmail(row.email),
  };

  if (member.hasTestAccess) {
    member.subscriptionStatus = "active";
    member.planCode = member.planCode || "courseClubMonthly";
    member.planName = member.planName || "Course Club Test Access";
    member.access = [
      {
        courseSlug: "course-club",
        accessStatus: "active",
        grantedAt: null,
        revokedAt: null,
      },
    ];
  }

  return member;
};

const getAdminDashboardMembers = async (client) => {
  const result = await client.query(
    `
      with latest_subscription as (
        select distinct on (s.user_id)
          s.user_id,
          s.id,
          s.status,
          s.current_period_end,
          s.created_at,
          p.plan_code,
          p.display_name
        from subscriptions s
        join subscription_plans p on p.id = s.plan_id
        order by s.user_id, s.created_at desc
      ),
      latest_payment as (
        select
          p.user_id,
          max(coalesce(p.paid_at, p.created_at)) as last_payment_at
        from payments p
        group by p.user_id
      ),
      latest_session as (
        select
          s.user_id,
          max(s.last_used_at) as last_seen_at
        from user_sessions s
        where s.revoked_at is null
        group by s.user_id
      )
      select
        u.id,
        u.email,
        u.full_name,
        u.account_type,
        u.agency_name,
        u.goals,
        u.avatar_url,
        u.status as account_status,
        u.created_at,
        ls.id as subscription_id,
        ls.status as subscription_status,
        ls.current_period_end,
        ls.plan_code,
        ls.display_name as plan_name,
        lp.last_payment_at,
        lse.last_seen_at,
        coalesce(
          json_agg(
            json_build_object(
              'courseSlug', ca.course_slug,
              'accessStatus', ca.access_status,
              'grantedAt', ca.granted_at,
              'revokedAt', ca.revoked_at
            )
          ) filter (where ca.id is not null),
          '[]'::json
        ) as access
      from users u
      left join latest_subscription ls on ls.user_id = u.id
      left join latest_payment lp on lp.user_id = u.id
      left join latest_session lse on lse.user_id = u.id
      left join course_access ca on ca.user_id = u.id
      group by
        u.id,
        ls.id,
        ls.status,
        ls.current_period_end,
        ls.plan_code,
        ls.display_name,
        lp.last_payment_at,
        lse.last_seen_at
      order by u.created_at desc
    `
  );

  const members = result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: getUserRole(row.email),
    isAdmin: isAdminEmail(row.email),
    accountType: row.account_type,
    agencyName: row.agency_name,
    goals: row.goals,
    avatarUrl: row.avatar_url,
    accountStatus: row.account_status,
    createdAt: row.created_at,
    subscriptionId: row.subscription_id,
    subscriptionStatus: row.subscription_status,
    currentPeriodEnd: row.current_period_end,
    planCode: row.plan_code,
    planName: row.plan_name,
    lastPaymentAt: row.last_payment_at,
    lastSeenAt: row.last_seen_at,
    access: row.access,
  }));

  const now = Date.now();
  const recentSignupThreshold = now - 1000 * 60 * 60 * 24 * 7;
  const activeMembers = members.filter((member) => member.subscriptionStatus === "active").length;
  const activeViewers = members.filter((member) =>
    Array.isArray(member.access) ? member.access.some((item) => item?.accessStatus === "active") : false
  ).length;
  const recentSignups = members.filter((member) => {
    const createdAt = member.createdAt ? new Date(member.createdAt).getTime() : 0;
    return createdAt >= recentSignupThreshold;
  }).length;

  return {
    summary: {
      totalMembers: members.length,
      activeMembers,
      activeViewers,
      recentSignups,
    },
    members,
  };
};

module.exports = {
  getMemberProfileByEmail,
  getAdminDashboardMembers,
};
