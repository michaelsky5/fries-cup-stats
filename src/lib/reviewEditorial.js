// Presentation copy only: keep the source scenes, facts and special roster
// branches intact. The same passages are selected in all three languages.
export function refineReviewScene(source, localized, locale, context) {
  const pick = (zh, en, ko) => locale === 'ko-KR' ? ko : locale === 'en-US' ? en : zh
  const eyebrow = source.eyebrow
  let body
  let recordNote
  let storyQuote

  if (eyebrow === 'WITNESS MEMORY') {
    body = pick(
      '也许你追完了整个赛季，也许只记得其中一场。把想起的队伍、地图或名字留在这里，再为这段回忆签个名。',
      'Perhaps you followed the whole season, or remember just one match. Bring back a team, a map, or a name, and sign this keepsake for the part you remember.',
      '시즌 내내 함께했을 수도, 단 한 경기만 기억할 수도 있습니다. 떠오르는 팀과 전장, 이름을 돌아보고 그 기억에 서명을 남겨 주세요.'
    )
    recordNote = pick(
      '本页汇总公开赛程、地图、排名与参与者名单；这些记录不包含个人观赛历史。签名用于制作个人纪念图。',
      'This page summarizes published fixtures, maps, standings and participant lists. Those records do not contain your personal viewing history. Your signature personalizes the keepsake.',
      '공개 일정, 전장, 순위와 참가 명단을 모은 페이지입니다. 이 기록에는 개인 시청 이력이 포함되어 있지 않으며, 서명은 기념 이미지에 사용됩니다.'
    )
    storyQuote = {
      title: pick('谢谢你把目光留在这里', 'Thank you for being here', '이곳에 함께해 주어 고맙습니다'),
      body: pick('比赛已经结束，你记得的那一幕还在。', 'The season has ended. The moment you remember stays with you.', '시즌은 끝났지만, 당신이 기억하는 장면은 남습니다.')
    }
  }

  if (source.storyType === 'staff' && context.matchCount > 0) {
    const { matchCount, stageCount, teamCount, partner, partnerCount, isCaster } = context
    const role = isCaster ? pick('解说', 'caster', '중계진') : pick('赛管', 'staff', '운영 스태프')
    const note = pick(
      '场次与搭档来自公开解说、赛管署名；同场记录不代表队伍归属，也不用于评价具体工作内容。',
      'Match and partner counts come from published caster and staff credits. Shared credits do not imply team membership or assess individual work.',
      '경기와 동료 수는 공개 중계·운영 명단에 근거합니다. 같은 경기의 기록은 팀 소속이나 개인 업무 평가를 뜻하지 않습니다.'
    )
    if (eyebrow === 'CASTER SEASON REVIEW' || eyebrow === 'STAFF SEASON REVIEW') {
      body = pick(
        `这个赛季，你的${role}署名出现在 ${matchCount} 场比赛里，走过 ${stageCount} 个阶段，遇见 ${teamCount} 支队伍。沿着这些对阵，重新打开属于你的赛季。`,
        `Your ${role} credits span ${matchCount} matches, ${stageCount} stages and ${teamCount} teams. Follow those matchups back through your season.`,
        `이번 시즌 ${role}으로 ${matchCount}경기, ${stageCount}개 단계, ${teamCount}개 팀의 경기에 이름을 남겼습니다. 그 대진을 따라 당신의 시즌을 다시 열어 보세요.`
      )
    } else if (eyebrow === 'YOU WERE THERE') {
      body = pick(
        `${matchCount} 场比赛，每一场都有对手、阶段和结果。往下看，这些场次会展开成你熟悉的队伍与搭档。`,
        `${matchCount} matches, each with a matchup, a stage and a result. From here, the numbers open into the teams and partners in your record.`,
        `${matchCount}경기마다 대진과 단계, 결과가 있습니다. 이 숫자를 따라가면 기록 속 팀과 동료들을 다시 만날 수 있습니다.`
      )
    } else if (eyebrow === 'TEAMS SEEN' && source.teamCards?.[0]) {
      const team = source.teamCards[0].title
      const count = Number(String(source.teamCards[0].value).match(/\d+/)?.[0] || 0)
      body = pick(
        `${team} 出现在你的 ${count} 场比赛记录里，是这一季最常相遇的队伍。沿着这些对阵，再看一遍他们的赛季。`,
        `${team} appears in ${count} of your match records, making it the team you encountered most often. Revisit its season through those matchups.`,
        `${team}은 당신의 경기 기록에 ${count}회 등장해 이번 시즌 가장 자주 만난 팀이 되었습니다. 그 대진을 따라 팀의 시즌을 돌아보세요.`
      )
    } else if (/^(CASTER PARTNERS|STAFF PARTNERS|A QUIET FRAME)$/.test(eyebrow) && partner) {
      body = pick(
        `${partner} 和你在 ${partnerCount} 场比赛的名单里一起出现。从一个熟悉的名字开始，回到那些共同参与过的对阵。`,
        `You and ${partner} share credits on ${partnerCount} matches. Start with that familiar name and revisit the matchups you both took part in.`,
        `${partner}와 ${partnerCount}경기의 명단에 함께 이름을 남겼습니다. 익숙한 이름을 따라 함께했던 대진으로 돌아가 보세요.`
      )
    } else if (eyebrow === 'FRIES CUP ARCHIVE') {
      body = pick(
        `${matchCount} 场${role}记录已经收好。谢谢你参与这个赛季；把一场对阵、一个搭档，或一个想记住的名字带走。`,
        `Your ${matchCount} ${role} credits are here to revisit. Thank you for taking part in this season. Keep a matchup, a partner, or a name you want to remember.`,
        `${matchCount}경기의 ${role} 기록을 이곳에 모았습니다. 이번 시즌에 함께해 주어 고맙습니다. 기억하고 싶은 대진과 동료, 이름을 간직해 주세요.`
      )
      storyQuote = {
        title: pick('这一季，也留下了你的名字', 'Your name is part of this season', '이 시즌에는 당신의 이름도 남았습니다'),
        body: pick('下一次重逢时，可以从这里说起。', 'When you meet again, this can be where the story starts.', '다시 만나는 날, 여기서 이야기를 시작해도 좋겠습니다.')
      }
    }
    if (body) recordNote = note
  }

  const perspective = context.perspective || ''
  const isTeamStaff = source.storyType === 'team' && /经理|教练|manager|coach/i.test(perspective)
  // Joining or leaving at a particular stage is part of the story, not a footnote.
  if (isTeamStaff && !context.hasRosterChange) {
    const dual = /经理.*教练|manager.*coach/i.test(perspective)
    const coach = !dual && /教练|coach/i.test(perspective)
    const role = dual ? pick('经理与教练', 'manager and coach', '매니저와 코치')
      : coach ? pick('教练', 'coach', '코치') : pick('经理', 'manager', '매니저')
    const team = context.team || pick('这支队伍', 'the team', '이 팀')
    if (eyebrow === 'TEAM SEASON REVIEW' || eyebrow === 'A QUIET FRAME') {
      body = pick(
        `${team} 的名单上，有你作为${role}的名字。从第一场对阵到最后的成绩，沿着队伍的赛程，重新看一遍这一季。`,
        `The ${team} roster carries your name as ${role}. Follow the team's fixtures from the opening matchup to the final result and revisit this season.`,
        `${team} 명단에 ${role}으로 당신의 이름이 남아 있습니다. 첫 대진부터 마지막 결과까지, 팀의 일정을 따라 이번 시즌을 돌아보세요.`
      )
    } else if (eyebrow === 'FINAL RESULT') {
      body = pick(
        `${team} 以${context.rank || '最终成绩'}结束赛季，你的${role}身份也留在这份队伍档案里。再回看这些名字与比赛，把想记住的一页带走。`,
        `${team} finished at ${context.rank || 'its final placing'}, with your ${role} credit kept in the team archive. Revisit the names and matches, and keep the page that matters to you.`,
        `${team}은 ${context.rank || '최종 순위'}로 시즌을 마쳤고, 당신의 ${role} 기록도 팀 아카이브에 남았습니다. 이름과 경기를 돌아보며 간직하고 싶은 한 페이지를 골라 보세요.`
      )
      storyQuote = {
        title: pick('赛季落幕，名字还在', 'The season ends; the names remain', '시즌은 끝나도 이름은 남습니다'),
        body: pick('谢谢你成为这支队伍故事的一部分。', "Thank you for being part of this team's story.", '이 팀의 이야기에 함께해 주어 고맙습니다.')
      }
    } else if (eyebrow === 'ADJUSTMENT') {
      const count = Number(String(source.title).match(/\d+/)?.[0] || 0)
      body = count > 0 ? pick(
        `这五个名字一起出现在 ${count} 张地图的记录里，是 ${team} 最常使用的五人组合。回看这些名字与位置，重新认一遍这套阵容。`,
        `These five names appear together in ${count} map records, forming ${team}'s most-used lineup. Revisit the names and roles that make up this five.`,
        `이 다섯 이름은 ${count}개의 전장 기록에 함께 등장한 ${team}의 최다 출전 조합입니다. 이름과 포지션을 따라 이 라인업을 다시 만나 보세요.`
      ) : pick('从这些名字与出场记录，回看这一季的阵容。', 'Revisit the roster through its names and appearance records.', '이름과 출전 기록을 따라 이번 시즌의 로스터를 돌아보세요.')
    } else if (eyebrow === 'KEY MATCH' && source.matchCard) {
      const match = source.matchCard
      const score = match.score || ''
      body = pick(
        `${match.left} 对阵 ${match.right}${score ? `，比分 ${score}` : ''}。把赛季停在这一场，再看看对手、阶段与结果如何连接到队伍的旅程。`,
        `${match.left} faced ${match.right}${score ? `, with a score of ${score}` : ''}. Pause the season at this match and trace how its opponent, stage and result fit into the team's journey.`,
        `${match.left}와 ${match.right}의 대결${score ? `, 스코어 ${score}` : ''}. 이 경기에 잠시 머물며 상대와 단계, 결과가 팀의 여정에 어떻게 이어지는지 돌아보세요.`
      )
    } else if (eyebrow === 'NOT ALONE') {
      body = pick('这些选手的名字，和你的身份一起留在同一份队伍档案里。沿着位置与出场地图，重新认一遍这一季的阵容。',
        'These player names sit beside your role in the same team archive. Revisit the roster through its roles and recorded maps.',
        '선수들의 이름과 당신의 역할이 같은 팀 아카이브에 남았습니다. 포지션과 출전 전장을 따라 이번 시즌의 로스터를 다시 만나 보세요.')
    }
    if (body) recordNote = pick(
      '个人身份依据最终阵容名单，比赛与成绩属于队伍记录。赛程不能说明个人参与了每一场，也不推断训练、战术或管理过程。',
      'Your role comes from the final roster; fixtures and results describe the team. They do not establish individual attendance at every match or infer training, tactics or management work.',
      '개인 역할은 최종 명단, 일정과 성적은 팀 기록에 근거합니다. 모든 경기의 개인 참여나 훈련·전술·운영 과정을 추정하지 않습니다.'
    )
  }

  if (!body) return localized
  return { ...localized, body, recordNote, storyQuote: storyQuote || null }
}
