package com.xin.ai.domain.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xin.ai.domain.entity.ModelChannelEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * M2-10 通道 Mapper：单表 CRUD 用 BaseMapper，复杂查询写 XML。
 * 行内注释1：Mapper 不跨表写，多表写由 Service 编排多个 Mapper。
 */
@Mapper
public interface ModelChannelMapper extends BaseMapper<ModelChannelEntity> {
}
