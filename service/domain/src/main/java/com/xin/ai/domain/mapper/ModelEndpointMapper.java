package com.xin.ai.domain.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xin.ai.domain.entity.ModelEndpointEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * M2-10 接入点 Mapper。
 * 行内注释1：按 capability+enabled+sort_order 查候选，由 Registry 组装 RoutePlan。
 */
@Mapper
public interface ModelEndpointMapper extends BaseMapper<ModelEndpointEntity> {
}
